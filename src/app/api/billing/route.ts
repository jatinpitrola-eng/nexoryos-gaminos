import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, serverError } from "@/lib/guards";
import { startOfDay, endOfDay, addDays } from "@/lib/hours";

export const runtime = "nodejs";

/** GET /api/billing?from=&to=&status=COMPLETED|ACTIVE|CANCELLED|ALL */
export async function GET(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const status = url.searchParams.get("status") || "COMPLETED";

    const from = fromParam && !isNaN(new Date(fromParam).getTime()) ? startOfDay(new Date(fromParam)) : addDays(startOfDay(new Date()), -7);
    const to = toParam && !isNaN(new Date(toParam).getTime()) ? endOfDay(new Date(toParam)) : endOfDay(new Date());

    const sessions = await db.session.findMany({
      where: {
        startedAt: { gte: from, lte: to },
        ...(status !== "ALL" ? { status } : {}),
      },
      orderBy: { startedAt: "desc" },
      take: 300,
      include: {
        station: { select: { name: true, type: true } },
        customer: { select: { name: true, phone: true } },
        payments: { select: { amount: true, method: true } },
        fnbOrders: { select: { total: true } },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        stationName: s.station.name,
        stationType: s.station.type,
        customerName: s.customer?.name ?? "Walk-in guest",
        customerPhone: s.customer?.phone ?? "",
        rateSnapshot: s.rateSnapshot,
        stationFee: s.stationFee,
        fnbTotal: s.fnbTotal,
        discount: s.discount,
        total: s.total,
        payments: s.payments.map((p) => ({ amount: p.amount, method: p.method })),
        fnbOrdersCount: s.fnbOrders.length,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}
