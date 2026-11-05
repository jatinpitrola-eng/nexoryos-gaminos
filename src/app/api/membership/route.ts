import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** POST /api/membership — attach a membership plan to a customer. */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "");
    const planName = String(body?.planName || "").trim();
    const price = Number(body?.price) || 0;
    const bonusMinutes = Math.max(0, Math.round(Number(body?.bonusMinutes) || 0));
    const months = Math.min(24, Math.max(1, Math.round(Number(body?.months) || 1)));
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
