import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** GET /api/billing/[id] — full invoice data. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const { id } = await params;

    const session = await db.session.findUnique({
      where: { id },
      include: {
        station: { select: { name: true, type: true } },
        customer: { select: { name: true, phone: true } },
        fnbOrders: true,
        payments: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!session) return badRequest("Session not found");

    return NextResponse.json({
      session: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        status: session.status,
        rateSnapshot: session.rateSnapshot,
        rateRule: session.rateRule,
        bonusMinutesUsed: session.bonusMinutesUsed,
        stationFee: session.stationFee,
        fnbTotal: session.fnbTotal,
        discount: session.discount,
        total: session.total,
      },
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
    });
  } catch (e) {
    return serverError(e);
  }
}
