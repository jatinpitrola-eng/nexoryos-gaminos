import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/**
 * POST /api/members/recharge
 * { customerId, amount > 0, bonusMinutes >= 0, note?, method? }
 * WalletTxn(RECHARGE, +amount) → wallet balance up.
 * bonusMinutes > 0 → separate WalletTxn(BONUS) row (minutes, NOT wallet money).
 */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const customerId = String(body?.customerId || "");
    const amount = Number(body?.amount) || 0;
    const bonusMinutes = Math.max(0, Math.round(Number(body?.bonusMinutes) || 0));
    const method = body?.method ? String(body.method) : "CASH";
    const note = body?.note ? String(body.note) : `Recharge (${method})`;

    if (!customerId) return badRequest("Customer is required");
    if (!(amount > 0)) return badRequest("Recharge amount must be greater than 0");

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) return badRequest("Customer not found");

    const result = await db.$transaction(async (tx) => {
      const recharge = await tx.walletTxn.create({
        data: { customerId, amount, type: "RECHARGE", note },
      });
      await tx.customer.update({ where: { id: customerId }, data: { walletBalance: { increment: amount } } });

      let bonus = null;
      if (bonusMinutes > 0) {
        bonus = await tx.walletTxn.create({
          data: { customerId, amount: bonusMinutes, type: "BONUS", note: `${bonusMinutes} bonus minutes from recharge` },
        });
      }
      return { recharge, bonus };
    });

    const updated = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, walletBalance: true, loyaltyPoints: true },
    });

    return NextResponse.json({
      customer: updated,
      txns: [result.recharge, result.bonus].filter(Boolean),
    });
  } catch (e) {
    return serverError(e);
  }
}
