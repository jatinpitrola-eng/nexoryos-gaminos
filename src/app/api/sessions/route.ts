import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { resolveRate } from "@/lib/rate";

export const runtime = "nodejs";

/** GET /api/sessions?status=ACTIVE — list sessions (used by POS + others). */
export async function GET(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "ACTIVE";

    const where =
      status === "ALL"
        ? {}
        : { status: status as "ACTIVE" | "COMPLETED" | "CANCELLED" };

    const sessions = await db.session.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        station: { select: { name: true, type: true } },
        customer: { select: { name: true, phone: true } },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        stationId: s.stationId,
        stationName: s.station.name,
        stationType: s.station.type,
        customerId: s.customerId,
        customerName: s.customer?.name ?? null,
        customerPhone: s.customer?.phone ?? null,
        startedAt: s.startedAt,
        rateSnapshot: s.rateSnapshot,
        status: s.status,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

/** POST /api/sessions — start a walk-in session. */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => null);
    const stationId = String(body?.stationId || "");
    const customerId = body?.customerId ? String(body.customerId) : undefined;
    const quick = body?.quickCustomer as { name?: string; phone?: string } | undefined;
    const plannedMinutes = body?.plannedMinutes ? Number(body.plannedMinutes) : undefined;
    const useBonusRequested = Math.max(0, Math.round(Number(body?.useBonusMinutes) || 0));

    if (!stationId) return badRequest("Station is required");

    const station = await db.station.findUnique({
      where: { id: stationId },
      include: { sessions: { where: { status: "ACTIVE" } } },
    });
    if (!station || !station.isActive) return badRequest("Station not found");
    if (station.status !== "FREE" || station.sessions.length > 0)
      return badRequest("Station is not free");

    // Resolve or quick-add customer
    let customer: { id: string; name: string; bonusMinutes: number } | null = null;
    if (customerId) {
      customer = await db.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, bonusMinutes: true },
      });
      if (!customer) return badRequest("Customer not found");
    } else if (quick && quick.name && quick.phone) {
      const phone = quick.phone.replace(/[\s-]/g, "");
      if (!/^\+?\d{10,13}$/.test(phone)) return badRequest("Please enter a valid phone number (10-13 digits)");
      customer = await db.customer.upsert({
        where: { phone },
        update: { name: quick.name.trim() },
        create: { name: quick.name.trim(), phone },
        select: { id: true, name: true, bonusMinutes: true },
      });
    } else {
      return badRequest("Pick a customer or add a new one with name + phone");
    }

    const now = new Date();
    const resolved = await resolveRate(station.type, station.hourlyRate, now);

    // Bonus (free-play) minutes: capped by what the customer actually has
    const bonusUse = Math.min(useBonusRequested, customer.bonusMinutes);

    const result = await db.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          stationId: station.id,
          customerId: customer.id,
          startedAt: now,
          plannedMinutes:
            plannedMinutes && plannedMinutes > 0
              ? Math.round(plannedMinutes)
              : bonusUse > 0
                ? bonusUse
                : null,
          rateSnapshot: resolved.rate,
          rateRule: resolved.ruleName,
          bonusMinutesUsed: bonusUse,
          status: "ACTIVE",
        },
        include: { customer: { select: { id: true, name: true, phone: true, walletBalance: true } } },
      });
      const updatedStation = await tx.station.update({ where: { id: station.id }, data: { status: "BUSY" } });
      if (bonusUse > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { bonusMinutes: { decrement: bonusUse } },
        });
      }
      return { session, updatedStation };
    });

    return NextResponse.json(
      {
        session: result.session,
        station: result.updatedStation,
        bonusUsed: bonusUse,
        rate: { rate: resolved.rate, kind: resolved.kind, ruleName: resolved.ruleName },
      },
      { status: 201 }
    );
  } catch (e) {
    return serverError(e);
  }
}
