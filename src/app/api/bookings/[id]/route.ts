import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { resolveRate } from "@/lib/rate";

export const runtime = "nodejs";

/** GET /api/bookings/[id] — single booking with relations. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: { station: { select: { name: true, type: true } }, customer: { select: { name: true, phone: true } } },
    });
    if (!booking) return badRequest("Booking not found");
    return NextResponse.json({ booking });
  } catch (e) {
    return serverError(e);
  }
}

/** PATCH /api/bookings/[id] — { action: CHECKIN | NOSHOW | CANCEL } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "");

    const booking = await db.booking.findUnique({
      where: { id },
      include: { station: true, customer: { select: { id: true, name: true } } },
    });
    if (!booking) return badRequest("Booking not found");

    if (action === "CHECKIN") {
      if (booking.status !== "BOOKED") return badRequest("Only booked slots can be checked in");
      const freshStation = await db.station.findUnique({
        where: { id: booking.stationId },
        include: { sessions: { where: { status: "ACTIVE" } } },
      });
      if (!freshStation) return badRequest("Station not found");
      if (freshStation.status !== "FREE" || freshStation.sessions.length > 0)
        return badRequest("Station is busy — end the current session first");

      const now = new Date();
      const resolved = await resolveRate(freshStation.type, freshStation.hourlyRate, now);

      const [, , , session] = await db.$transaction([
        db.session.create({
          data: {
            stationId: booking.stationId,
            customerId: booking.customerId,
            bookingId: booking.id,
            startedAt: now,
            rateSnapshot: resolved.rate,
            status: "ACTIVE",
          },
        }),
        db.station.update({ where: { id: booking.stationId }, data: { status: "BUSY" } }),
        db.booking.update({ where: { id: booking.id }, data: { status: "CHECKEDIN" } }),
        db.session.findFirst({
          where: { bookingId: booking.id },
          include: { customer: { select: { id: true, name: true, phone: true, walletBalance: true } } },
        }),
      ]);

      return NextResponse.json({ booking: { ...booking, status: "CHECKEDIN" }, session });
    }

    if (action === "NOSHOW") {
      if (booking.status !== "BOOKED") return badRequest("Only booked slots can be marked no-show");
      const updated = await db.booking.update({ where: { id: booking.id }, data: { status: "NOSHOW" } });
      return NextResponse.json({ booking: updated });
    }

    if (action === "CANCEL") {
      if (booking.status !== "BOOKED") return badRequest("Only booked slots can be cancelled");
      const updated = await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
      return NextResponse.json({ booking: updated });
    }

    return badRequest("Invalid action");
  } catch (e) {
    return serverError(e);
  }
}
