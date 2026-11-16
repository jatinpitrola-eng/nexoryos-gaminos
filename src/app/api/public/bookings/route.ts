import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { badRequest, serverError } from "@/lib/guards";
import { getZoneSettings } from "@/lib/settings";
import { startOfDay, endOfDay, minutesOverlap, addDays } from "@/lib/hours";
import { makeBookingCode } from "@/lib/money";

export const runtime = "nodejs";

const STATION_TYPES = ["PS5", "XBOX", "PC", "VR", "SNOOKER", "RACING"] as const;

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize "+91 98765-43210" style input to a 10-digit Indian mobile number. */
function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s-]/g, "");
  if (!/^\+?(91)?0?\d{10}$/.test(stripped)) return null;
  let p = stripped.startsWith("+") ? stripped.slice(1) : stripped;
  if (p.length === 13 && p.startsWith("910")) p = p.slice(3);
  else if (p.length === 12 && p.startsWith("91")) p = p.slice(2);
  else if (p.length === 11 && p.startsWith("0")) p = p.slice(1);
  if (!/^[6-9]\d{9}$/.test(p)) return null;
  return p;
}

/** POST /api/public/bookings — public, no auth. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid request body");

    const name = String(body?.name ?? "").trim();
    if (name.length < 2 || name.length > 60) return badRequest("Please enter your name (2–60 characters)");

    const phone = normalizePhone(String(body?.phone ?? ""));
    if (!phone) return badRequest("Enter a valid 10-digit Indian mobile number (e.g. 98765 43210)");

    const stationType = String(body?.stationType ?? "");
    if (!(STATION_TYPES as readonly string[]).includes(stationType)) return badRequest("Please choose a station type");

    const now = new Date();
    const dateStr = String(body?.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return badRequest("Please pick a date");
    const day = new Date(dateStr + "T00:00:00");
    if (isNaN(day.getTime())) return badRequest("Invalid date");
    if (day < startOfDay(now) || day > addDays(startOfDay(now), 6))
      return badRequest("Bookings are open for today up to 6 days ahead");

    const settings = await getZoneSettings();
    const startHour = Number(body?.startHour);
    if (!Number.isInteger(startHour) || startHour < settings.openHour || startHour > settings.closeHour - 1)
      return badRequest(`Start time must be between ${settings.openHour}:00 and ${settings.closeHour - 1}:00`);
    const hours = Number(body?.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 6) return badRequest("Duration must be between 1 and 6 hours");
    if (startHour + hours > settings.closeHour) return badRequest(`Slot must end by ${settings.closeHour}:00`);

    const isToday = toYMD(day) === toYMD(now);
    if (isToday && startHour < now.getHours()) return badRequest("That time has already passed — pick a later slot");

    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const slotStart = new Date(dayStart);
    slotStart.setHours(startHour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + hours * 3600_000);

    const candidates = await db.station.findMany({
      where: { type: stationType, isActive: true },
      orderBy: { name: "asc" },
      include: {
        sessions: { where: { status: "ACTIVE" } },
        bookings: {
          where: { status: { in: ["BOOKED", "CHECKEDIN"] }, slotStart: { gte: dayStart, lte: dayEnd } },
        },
      },
    });

    const currentHour = now.getHours();
    const station = candidates.find((st) => {
      if (st.status === "MAINTENANCE") return false;
      if (st.bookings.some((b) => minutesOverlap(slotStart, slotEnd, new Date(b.slotStart), new Date(b.slotEnd)) > 0)) return false;
      if (isToday && st.sessions.length > 0) {
        for (let h = startHour; h < startHour + hours; h++) if (h === currentHour) return false;
      }
      return true;
    });

    if (!station) return badRequest(`All ${stationType} stations are busy for that time — try another slot`);

    const existing = await db.customer.findUnique({ where: { phone } });
    const customer = existing
      ? existing.name === name
        ? existing
        : await db.customer.update({ where: { id: existing.id }, data: { name } })
      : await db.customer.create({ data: { name, phone } });

    const booking = await db.booking.create({
      data: {
        code: makeBookingCode(),
        stationId: station.id,
        customerId: customer.id,
        slotStart,
        slotEnd,
        status: "BOOKED",
        source: "ONLINE",
        depositAmount: 0,
        depositPaid: false,
        notify: Boolean(body?.notify),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        booking: {
          code: booking.code,
          stationName: station.name,
          stationType: station.type,
          slotStart: booking.slotStart,
          slotEnd: booking.slotEnd,
          notify: booking.notify,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return serverError(e);
  }
}
