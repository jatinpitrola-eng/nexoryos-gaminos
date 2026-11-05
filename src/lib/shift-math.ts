// Server-side shift cash math (shared by /api/shifts GET and /api/shifts/close).
import { db } from "@/lib/db";

export async function computeShiftTotals(from: Date, to: Date) {
  const [cashPayments, recharges, standalone] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: { method: "CASH", createdAt: { gte: from, lte: to } },
    }),
    db.walletTxn.aggregate({
      _sum: { amount: true },
      where: { type: "RECHARGE", createdAt: { gte: from, lte: to } },
    }),
    db.fnBOrder.aggregate({
      _sum: { total: true },
      where: { sessionId: null, status: "PAID", createdAt: { gte: from, lte: to } },
    }),
  ]);
  const cashSessionPayments = cashPayments._sum.amount ?? 0;
  const walletRecharges = recharges._sum.amount ?? 0;
  const standaloneFnB = standalone._sum.total ?? 0;
  return {
    cashSessionPayments: Math.round(cashSessionPayments),
    walletRecharges: Math.round(walletRecharges),
    standaloneFnB: Math.round(standaloneFnB),
    systemTotal: Math.round(cashSessionPayments + walletRecharges + standaloneFnB),
  };
}
