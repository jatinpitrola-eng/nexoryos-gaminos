import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/lib/types";

export const runtime = "nodejs";

/** Tier presets — used when body.tier is a known tier, unless the field is explicitly provided. */
const TIER_PRESETS: Record<MembershipTier, { planName: string; price: number; bonusMinutes: number; months: number }> = {
  SILVER: { planName: "Silver Membership", price: 299, bonusMinutes: 0, months: 1 },
  GOLD: { planName: "Gold Membership", price: 599, bonusMinutes: 60, months: 1 },
  PLATINUM: { planName: "Platinum Membership", price: 999, bonusMinutes: 180, months: 1 },
};

/** POST /api/membership — attach a membership plan to a customer. */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "");

    // Optional tier preset: fills planName/price/bonusMinutes/duration unless explicitly provided.
    const tierKey = (typeof body?.tier === "string" ? body.tier.toUpperCase() : "") as MembershipTier;
    const preset = MEMBERSHIP_TIERS.includes(tierKey) ? TIER_PRESETS[tierKey] : null;

    const planName = String(body?.planName || "").trim() || preset?.planName || "";
    const price = Number(body?.price) > 0 ? Number(body.price) : preset?.price ?? 0;
    const bonusMinutesRaw = body?.bonusMinutes !== undefined && body?.bonusMinutes !== "" ? Number(body.bonusMinutes) : null;
    const bonusMinutes = bonusMinutesRaw !== null && !isNaN(bonusMinutesRaw) && bonusMinutesRaw >= 0
      ? Math.max(0, Math.round(bonusMinutesRaw))
      : preset?.bonusMinutes ?? 0;
    const monthsRaw = body?.months !== undefined && Number(body?.months) > 0 ? Math.round(Number(body.months)) : null;
    const months = Math.min(24, Math.max(1, monthsRaw ?? preset?.months ?? 1));
    const startsAt = body?.startsAt && !isNaN(new Date(body.startsAt).getTime()) ? new Date(body.startsAt) : new Date();

    if (!customerId) return badRequest("Customer is required");
    if (!planName) return badRequest("Plan name is required");
    if (!(price > 0)) return badRequest("Price must be greater than 0");

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) return badRequest("Customer not found");

    const expiresAt = new Date(startsAt);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const membership = await db.$transaction(async (tx) => {
      const m = await tx.membership.create({
        data: { customerId, planName, price, bonusMinutes, startsAt, expiresAt, isActive: true },
      });
      if (bonusMinutes > 0) {
        await tx.walletTxn.create({
          data: {
            customerId,
            amount: bonusMinutes,
            type: "BONUS",
            note: `${bonusMinutes} bonus minutes from ${planName}`,
          },
        });
      }
      return m;
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
