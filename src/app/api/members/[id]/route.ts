import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** GET /api/members/[id] — full member detail (wallet, txns, sessions, memberships). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        walletTxns: { orderBy: { createdAt: "desc" }, take: 30 },
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 20,
          include: { station: { select: { name: true, type: true } } },
        },
        memberships: { orderBy: { startsAt: "desc" } },
      },
    });
    if (!customer) return badRequest("Customer not found");

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        walletBalance: customer.walletBalance,
        loyaltyPoints: customer.loyaltyPoints,
        createdAt: customer.createdAt,
      },
      txns: customer.walletTxns.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        note: t.note,
        createdAt: t.createdAt,
      })),
      sessions: customer.sessions.map((s) => ({
        id: s.id,
        stationName: s.station.name,
        stationType: s.station.type,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        total: s.total,
        status: s.status,
      })),
      memberships: customer.memberships.map((m) => ({
        id: m.id,
        planName: m.planName,
        price: m.price,
        bonusMinutes: m.bonusMinutes,
        startsAt: m.startsAt,
        expiresAt: m.expiresAt,
        isActive: m.isActive,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

/** PATCH /api/members/[id] — update name/email. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const data: { name?: string; email?: string } = {};
    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return badRequest("Name cannot be empty");
      data.name = name;
    }
    if (body?.email !== undefined) data.email = String(body.email).trim() || null as unknown as string;

    const customer = await db.customer.update({ where: { id }, data });
    return NextResponse.json({ customer });
  } catch (e) {
    return serverError(e);
  }
}
