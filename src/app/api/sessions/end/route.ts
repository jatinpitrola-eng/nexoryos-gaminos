import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { computeStationFeeWithPause, loyaltyPointsFor, formatINR } from "@/lib/money";

export const runtime = "nodejs";

const METHODS = ["UPI", "CASH", "CARD"] as const;

/**
 * POST /api/sessions/end — end a session, compute the bill, record payments
 * (UPI/CASH/CARD split + optional wallet debit), award loyalty points,
 * mark F&B orders paid and free the station.
 */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => null);
    const sessionId = String(body?.sessionId || "");
    const discount = Math.max(0, Number(body?.discount) || 0);
    const walletAmount = Math.max(0, Number(body?.walletAmount) || 0);
    const paymentsIn = Array.isArray(body?.payments) ? body.payments : [];

    if (!sessionId) return badRequest("Session is required");

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        station: { select: { id: true, name: true, type: true, hourlyRate: true } },
        customer: { select: { id: true, name: true, phone: true, walletBalance: true, loyaltyPoints: true } },
        fnbOrders: { select: { id: true, total: true, status: true } },
      },
    });
    if (!session) return badRequest("Session not found");
    if (session.status !== "ACTIVE" && session.status !== "PAUSED") return badRequest("Session already ended");

    const endedAt = new Date();
    const pausedTotal =
      session.pausedMinutes +
      (session.status === "PAUSED" && session.pausedAt
        ? Math.max(0, Math.round((endedAt.getTime() - session.pausedAt.getTime()) / 60000))
        : 0);
    const { minutes, fee, bonusUsed } = computeStationFeeWithPause(
      session.rateSnapshot,
      session.startedAt,
      endedAt,
      pausedTotal,
      session.bonusMinutesUsed
    );
    // Bonus minutes committed but not actually played → credit back to the wallet of minutes
    const bonusRefund = Math.max(0, session.bonusMinutesUsed - bonusUsed);
    const fnbTotal = session.fnbOrders.reduce((s, o) => s + o.total, 0);
    const maxDiscount = fee + fnbTotal;
    const safeDiscount = Math.min(discount, maxDiscount);
    const total = Math.max(0, Math.round(fee + fnbTotal - safeDiscount));

    // Validate payments
    const payments: { method: (typeof METHODS)[number]; amount: number }[] = [];
    for (const p of paymentsIn) {
      const amount = Number(p?.amount) || 0;
      const method = String(p?.method || "").toUpperCase() as (typeof METHODS)[number];
      if (amount > 0) {
        if (!METHODS.includes(method)) return badRequest("Invalid payment method");
        payments.push({ method, amount: Math.round(amount) });
      }
    }
    const paidByMethod = payments.reduce((s, p) => s + p.amount, 0);

    // Wallet guard
    if (walletAmount > 0) {
      if (!session.customer) return badRequest("No customer linked — cannot use wallet");
      if (body?.walletCustomerId && String(body.walletCustomerId) !== session.customer.id)
        return badRequest("Wallet customer mismatch");
      if (walletAmount > session.customer.walletBalance + 0.001) {
        return badRequest(
          `Insufficient wallet balance — ${formatINR(session.customer.walletBalance)} available, ${formatINR(walletAmount)} requested`
        );
      }
    }

    const paidTotal = paidByMethod + walletAmount;
    if (paidTotal !== total) {
      return badRequest(
        `Payment mismatch: bill is ${formatINR(total)}, payments add up to ${formatINR(paidTotal)}`
      );
    }

    // Write everything
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.session.update({
        where: { id: sessionId },
        data: {
          endedAt,
          stationFee: fee,
          bonusMinutesUsed: bonusUsed,
          fnbTotal: Math.round(fnbTotal),
          discount: safeDiscount,
          total,
          status: "COMPLETED",
        },
      });

      if (bonusRefund > 0 && session.customer) {
        await tx.customer.update({
          where: { id: session.customer.id },
          data: { bonusMinutes: { increment: bonusRefund } },
        });
      }

      for (const p of payments) {
        await tx.payment.create({
          data: { sessionId, amount: p.amount, method: p.method },
        });
      }

      if (walletAmount > 0 && session.customer) {
        await tx.walletTxn.create({
          data: {
            customerId: session.customer.id,
            amount: -walletAmount,
            type: "SPEND",
            note: `Session bill — ${session.station.name}`,
          },
        });
        await tx.customer.update({
          where: { id: session.customer.id },
          data: { walletBalance: { decrement: walletAmount } },
        });
      }

      if (session.fnbOrders.length > 0) {
        await tx.fnBOrder.updateMany({
          where: { id: { in: session.fnbOrders.map((o) => o.id) }, status: "OPEN" },
          data: { status: "PAID" },
        });
      }

      const points = loyaltyPointsFor(total);
      if (points > 0 && session.customer) {
        await tx.customer.update({
          where: { id: session.customer.id },
          data: { loyaltyPoints: { increment: points } },
        });
      }

      await tx.station.update({ where: { id: session.station.id }, data: { status: "FREE" } });

      return { session: updated, points };
    });

    return NextResponse.json({
      bill: {
        minutes,
        fee,
        bonusUsed,
        bonusRefund,
        fnbTotal: Math.round(fnbTotal),
        discount: safeDiscount,
        total,
        payments,
        walletAmount,
        loyaltyEarned: result.points,
      },
      session: result.session,
    });
  } catch (e) {
    return serverError(e);
  }
}
