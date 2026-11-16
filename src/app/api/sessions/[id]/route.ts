import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { computeStationFeeWithPause } from "@/lib/money";

export const runtime = "nodejs";

/** GET /api/sessions/[id] — session detail for billing modal / invoice. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const session = await db.session.findUnique({
      where: { id },
      include: {
        station: { select: { id: true, name: true, type: true, hourlyRate: true } },
        customer: { select: { id: true, name: true, phone: true, walletBalance: true, loyaltyPoints: true } },
        fnbOrders: true,
        payments: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!session) return badRequest("Session not found");

    const now = new Date();
    const pausedTotal =
      session.pausedMinutes +
      (session.status === "PAUSED" && session.pausedAt
        ? Math.max(0, Math.round((now.getTime() - session.pausedAt.getTime()) / 60000))
        : 0);
    const { minutes, fee, bonusUsed } = computeStationFeeWithPause(
      session.rateSnapshot,
      session.startedAt,
      session.endedAt ?? now,
      pausedTotal,
      session.bonusMinutesUsed
    );

    return NextResponse.json({
      session: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        status: session.status,
        rateSnapshot: session.rateSnapshot,
        rateRule: session.rateRule,
        pausedMinutes: session.pausedMinutes,
        bonusMinutesUsed: session.bonusMinutesUsed,
        stationFee: session.stationFee,
        fnbTotal: session.fnbTotal,
        discount: session.discount,
        total: session.total,
        station: session.station,
        customer: session.customer,
        orders: session.fnbOrders.map((o) => {
          let items: { name: string; price: number; qty: number }[] = [];
          try {
            items = JSON.parse(o.items);
          } catch {
            items = [];
          }
          return { id: o.id, items, total: o.total, status: o.status, createdAt: o.createdAt };
        }),
        payments: session.payments.map((p) => ({ amount: p.amount, method: p.method, createdAt: p.createdAt })),
      },
      live: { minutes, fee, bonusUsed },
    });
  } catch (e) {
    return serverError(e);
  }
}
