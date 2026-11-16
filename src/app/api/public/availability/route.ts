import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { badRequest, serverError } from "@/lib/guards";
import { getZoneSettings } from "@/lib/settings";
import { startOfDay, endOfDay, minutesOverlap, addDays } from "@/lib/hours";

export const runtime = "nodejs";

const BLOCKING = ["BOOKED", "CHECKEDIN"] as const;

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** GET /api/public/availability?date=YYYY-MM-DD — public, no auth. */
export async function GET(req: Request) {
  try {
    const settings = await getZoneSettings();
    const now = new Date();

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date") ?? "";
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : toYMD(now);

    const day = new Date(dateStr + "T00:00:00");
    if (isNaN(day.getTime())) return badRequest("Invalid date — expected YYYY-MM-DD");
    if (day < startOfDay(now) || day > addDays(startOfDay(now), 6))
      return badRequest("Date must be between today and 6 days ahead");

    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const isToday = toYMD(day) === toYMD(now);
    const currentHour = now.getHours();

    const stations = await db.station.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        sessions: { where: { status: "ACTIVE" } },
        bookings: {
          where: { status: { in: [...BLOCKING] }, slotStart: { gte: dayStart, lte: dayEnd } },
          orderBy: { slotStart: "asc" },
        },
      },
    });

    const hours: number[] = [];
    for (let h = settings.openHour; h < settings.closeHour; h++) hours.push(h);

    function hourStart(h: number): Date {
      const d = new Date(dayStart);
      d.setHours(h, 0, 0, 0);
      return d;
    }

    function freeAt(st: (typeof stations)[number], h: number): boolean {
      if (st.status === "MAINTENANCE") return false;
      if (isToday && h === currentHour && st.sessions.length > 0) return false;
      const ws = hourStart(h);
      const we = new Date(ws.getTime() + 3600_000);
      return !st.bookings.some((b) => minutesOverlap(ws, we, new Date(b.slotStart), new Date(b.slotEnd)) > 0);
    }

    const byType = new Map<string, typeof stations>();
    for (const st of stations) {
      const list = byType.get(st.type) ?? [];
      list.push(st);
      byType.set(st.type, list);
    }

    const types = [...byType.entries()].map(([type, list]) => ({
      type,
      total: list.length,
      hours: hours.map((h) => ({
        hour: h,
        available: isToday && h < currentHour ? 0 : list.filter((st) => freeAt(st, h)).length,
      })),
    }));

    const stationList = stations.map((st) => {
      let status: "FREE" | "BUSY" | "MAINTENANCE" | "BOOKED" = "FREE";
      let busyUntil: string | null = null;

      if (st.status === "MAINTENANCE") {
        status = "MAINTENANCE";
      } else if (isToday && st.sessions.length > 0) {
        status = "BUSY";
        const ends: number[] = [];
        const sess = st.sessions[0];
        if (sess.plannedMinutes && sess.plannedMinutes > 0)
          ends.push(new Date(sess.startedAt).getTime() + sess.plannedMinutes * 60_000);
        for (const b of st.bookings) if (new Date(b.slotEnd).getTime() > now.getTime()) ends.push(new Date(b.slotEnd).getTime());
        if (ends.length) busyUntil = new Date(Math.min(...ends)).toISOString();
      } else {
        const next = st.bookings.find((b) => b.status === "BOOKED" && new Date(b.slotEnd).getTime() > now.getTime());
        if (next) {
          status = "BOOKED";
          busyUntil = new Date(next.slotEnd).toISOString();
        }
      }

      let nextFreeHour: number | null = null;
      if (isToday) {
        for (const h of hours) {
          if (h < currentHour) continue;
          if (freeAt(st, h)) {
            nextFreeHour = h;
            break;
          }
        }
      }

      return { id: st.id, name: st.name, type: st.type, status, busyUntil, nextFreeHour };
    });

    return NextResponse.json({
      zoneName: settings.zoneName,
      openHour: settings.openHour,
      closeHour: settings.closeHour,
      date: dateStr,
      now: now.toISOString(),
      types,
      stations: stationList,
    });
  } catch (e) {
    return serverError(e);
  }
}
