import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, serverError } from "@/lib/guards";
import { getZoneSettings } from "@/lib/settings";
import { startOfDay, endOfDay, addDays, minutesOverlap } from "@/lib/hours";

export const runtime = "nodejs";

/** GET /api/reports?range=day|week|month&date=YYYY-MM-DD — revenue, stations, heatmap, split. */
export async function GET(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "week";
    const dateParam = url.searchParams.get("date");
    const base = dateParam && !isNaN(new Date(dateParam + "T12:00:00").getTime()) ? new Date(dateParam + "T12:00:00") : new Date();

    const settings = await getZoneSettings();
    const now = new Date();

    let from: Date, to: Date;
    if (range === "day") {
      from = startOfDay(base);
      to = endOfDay(base);
    } else if (range === "month") {
      from = new Date(base.getFullYear(), base.getMonth(), 1);
      to = endOfDay(new Date(base.getFullYear(), base.getMonth() + 1, 0));
    } else {
      // week = 7 days ending at base date
      from = startOfDay(addDays(base, -6));
      to = endOfDay(base);
    }

    // Window buckets for rows
    const buckets: { label: string; start: Date; end: Date }[] = [];
    if (range === "day") {
      for (let h = settings.openHour; h < settings.closeHour; h++) {
        const start = new Date(from);
        start.setHours(h, 0, 0, 0);
        const end = new Date(start.getTime() + 3600_000);
        buckets.push({ label: `${h}:00`, start, end });
      }
    } else if (range === "month") {
      for (let d = 1; d <= to.getDate(); d++) {
        const start = new Date(base.getFullYear(), base.getMonth(), d);
        buckets.push({ label: String(d), start, end: endOfDay(start) });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const start = startOfDay(addDays(to, -i));
        buckets.push({
          label: start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
          start,
          end: endOfDay(start),
        });
      }
    }

    const [sessions, standalone, memberships, fnbOrders, stations] = await Promise.all([
      db.session.findMany({
        where: { startedAt: { gte: from, lte: to }, status: "COMPLETED" },
        include: { station: { select: { id: true, name: true, type: true } } },
      }),
      db.fnBOrder.findMany({ where: { sessionId: null, createdAt: { gte: from, lte: to } }, select: { total: true, createdAt: true } }),
      db.membership.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { price: true, createdAt: true } }),
      db.fnBOrder.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { sessionId: true, total: true, createdAt: true },
      }),
      db.station.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);

    // Rows (revenue per bucket)
    const rows = buckets.map((b) => {
      const gaming = sessions
        .filter((s) => s.startedAt >= b.start && s.startedAt < b.end)
        .reduce((sum, s) => sum + s.stationFee, 0);
      const fnb =
        sessions.filter((s) => s.startedAt >= b.start && s.startedAt < b.end).reduce((sum, s) => sum + s.fnbTotal, 0) +
        standalone.filter((o) => o.createdAt >= b.start && o.createdAt < b.end).reduce((sum, o) => sum + o.total, 0);
      const ms = memberships
        .filter((m) => m.createdAt >= b.start && m.createdAt < b.end)
        .reduce((sum, m) => sum + m.price, 0);
      return {
        label: b.label,
        gaming: Math.round(gaming),
        fnb: Math.round(fnb),
        memberships: Math.round(ms),
        total: Math.round(gaming + fnb + ms),
      };
    });

    // Per-station stats
    const openHours = (range === "day" ? 1 : range === "week" ? 7 : Math.max(1, to.getDate())) * (settings.closeHour - settings.openHour);
    const stationStats = stations
      .map((st) => {
        const stSessions = sessions.filter((s) => s.stationId === st.id);
        const busyMinutes = stSessions.reduce((sum, s) => {
          const end = s.endedAt ?? now;
          return sum + Math.max(0, (end.getTime() - s.startedAt.getTime()) / 60000);
        }, 0);
        return {
          stationId: st.id,
          name: st.name,
          type: st.type,
          sessions: stSessions.length,
          revenue: Math.round(stSessions.reduce((sum, s) => sum + s.total, 0)),
          busyMinutes: Math.round(busyMinutes),
          utilizationPct: openHours > 0 ? Math.min(100, Math.round((busyMinutes / 60 / openHours) * 100)) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Heatmap: last 7 days ending `to`, hours openHour..closeHour-1
    const hmDays: { date: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(addDays(to, -i));
      hmDays.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      });
    }
    const hmHours: number[] = [];
    for (let h = settings.openHour; h < settings.closeHour; h++) hmHours.push(h);

    // All non-cancelled sessions overlapping the heatmap window
    const hmFrom = startOfDay(addDays(to, -6));
    const heatSessions = await db.session.findMany({
      where: { startedAt: { lte: endOfDay(to) }, status: { not: "CANCELLED" }, OR: [{ endedAt: { gte: hmFrom } }, { status: "ACTIVE" }] },
      select: { startedAt: true, endedAt: true, status: true },
    });
    const cells = hmDays.map((d) => {
      const dayStart = startOfDay(new Date(d.date + "T00:00:00"));
      return hmHours.map((h) => {
        const hourStart = new Date(dayStart);
        hourStart.setHours(h, 0, 0, 0);
        const hourEnd = new Date(hourStart.getTime() + 3600_000);
        let minutes = 0;
        for (const s of heatSessions) {
          const end = s.endedAt ?? (s.status === "ACTIVE" ? now : s.startedAt);
          minutes += minutesOverlap(s.startedAt, end, hourStart, hourEnd);
        }
        return Math.min(60, Math.round(minutes));
      });
    });

    // Split
    const gamingTotal = sessions.reduce((sum, s) => sum + s.stationFee, 0);
    const fnbSessionTotal = sessions.reduce((sum, s) => sum + s.fnbTotal, 0);
    const fnbStandaloneTotal = standalone.reduce((sum, o) => sum + o.total, 0);
    const membershipsTotal = memberships.reduce((sum, m) => sum + m.price, 0);

    const expenses = await db.expense.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
      select: { title: true, category: true, amount: true, date: true },
    });
    const expensesTotal = expenses.reduce((sum, x) => sum + x.amount, 0);
    const periodRevenue = gamingTotal + fnbSessionTotal + fnbStandaloneTotal + membershipsTotal;

    return NextResponse.json({
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      rows,
      stationStats,
      heatmap: { days: hmDays, hours: hmHours, cells },
      split: {
        gaming: Math.round(gamingTotal),
        fnb: Math.round(fnbSessionTotal + fnbStandaloneTotal),
        memberships: Math.round(membershipsTotal),
        total: Math.round(gamingTotal + fnbSessionTotal + fnbStandaloneTotal + membershipsTotal),
      },
      expensesTotal: Math.round(expensesTotal),
      netProfit: Math.round(periodRevenue - expensesTotal),
      expenses,
    });
  } catch (e) {
    return serverError(e);
  }
}
