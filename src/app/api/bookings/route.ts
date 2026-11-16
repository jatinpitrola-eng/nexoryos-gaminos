import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { getZoneSettings } from "@/lib/settings";
import { startOfDay, endOfDay, minutesOverlap } from "@/lib/hours";
import { makeBookingCode } from "@/lib/money";

export const runtime = "nodejs";

const SOURCES = ["WALKIN", "PHONE", "ONLINE"] as const;

export async function GET(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const day = dateParam ? startOfDay(new Date(dateParam + "T00:00:00")) : startOfDay(new Date());

    const bookings = await db.booking.findMany({
      where: { slotStart: { gte: startOfDay(day), lte: endOfDay(day) } },
      orderBy: { slotStart: "asc" },
      include: {
        station: { select: { name: true, type: true } },
        customer: { select: { name: true, phone: true } },
      },
    });

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        code: b.code,
        stationId: b.stationId,
        stationName: b.station.name,
        stationType: b.station.type,
        customerId: b.customerId,
        customerName: b.customer.name,
        customerPhone: b.customer.phone,
        slotStart: b.slotStart,
        slotEnd: b.slotEnd,
        depositAmount: b.depositAmount,
        depositPaid: b.depositPaid,
        status: b.status,
        source: b.source,
        notify: b.notify,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => null);
    const stationId = String(body?.stationId || "");
    const customerId = String(body?.customerId || "");
    const slotStart = body?.slotStart ? new Date(body.slotStart) : null;
    const slotEnd = body?.slotEnd ? new Date(body.slotEnd) : null;
    const depositAmount = Math.max(0, Number(body?.depositAmount) || 0);
    const depositPaid = Boolean(body?.depositPaid);
    const source = (SOURCES as readonly string[]).includes(String(body?.source)) ? String(body.source) : "PHONE";

    if (!stationId || !customerId || !slotStart || !slotEnd || isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime()))
      return badRequest("Station, customer and a valid slot are required");
    if (slotEnd <= slotStart) return badRequest("Slot end must be after slot start");

    const settings = await getZoneSettings();
    const now = new Date();
    if (slotStart < new Date(now.getTime() - 5 * 60_000)) return badRequest("Slot is in the past");

    const dayStart = startOfDay(slotStart);
    const dayEnd = endOfDay(slotStart);
    if (slotStart < dayStart || slotEnd > dayEnd) return badRequest("Slot must start and end on the same day");
    if (slotStart.getHours() < settings.openHour || slotEnd.getHours() > settings.closeHour || (slotEnd.getHours() === settings.closeHour && slotEnd.getMinutes() > 0))
      return badRequest(`Slots must be between ${settings.openHour}:00 and ${settings.closeHour}:00`);

    const [station, customer] = await Promise.all([
      db.station.findUnique({ where: { id: stationId } }),
      db.customer.findUnique({ where: { id: customerId } }),
    ]);
    if (!station || !station.isActive) return badRequest("Station not found");
    if (!customer) return badRequest("Customer not found");

    const sameDay = await db.booking.findMany({
      where: { stationId, status: { in: ["BOOKED", "CHECKEDIN"] }, slotStart: { gte: dayStart, lte: dayEnd } },
    });
    const conflict = sameDay.find((b) => minutesOverlap(slotStart, slotEnd, b.slotStart, b.slotEnd) > 0);
    if (conflict) return badRequest("That slot conflicts with another booking");

    const booking = await db.booking.create({
      data: {
        code: makeBookingCode(),
        stationId,
        customerId,
        slotStart,
        slotEnd,
        depositAmount,
        depositPaid,
        status: "BOOKED",
        source,
      },
      include: { station: { select: { name: true } }, customer: { select: { name: true } } },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
