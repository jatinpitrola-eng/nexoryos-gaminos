import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, serverError } from "@/lib/guards";
import { getZoneSettings } from "@/lib/settings";
import { startOfDay, endOfDay, addDays, minutesOverlap } from "@/lib/hours";
import type { DashboardPayload, FloorStation } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [stations, todayCompleted, weekSessions, standaloneOrders, walletAgg, upcomingBookings, settings, members] =
      await Promise.all([
        db.station.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            sessions: {
              where: { status: "ACTIVE" },
              include: { customer: { select: { name: true, phone: true } } },
              take: 1,
            },
          },
        }),
        db.session.findMany({
          where: { status: "COMPLETED", startedAt: { gte: todayStart, lte: todayEnd } },
          select: { total: true },
        }),
        db.session.findMany({
          where: { status: "COMPLETED", startedAt: { gte: addDays(todayStart, -6) } },
          select: { total: true, startedAt: true },
        }),
        db.fnBOrder.findMany({
          where: { sessionId: null, createdAt: { gte: addDays(todayStart, -6) } },
          select: { total: true, createdAt: true },
        }),
        db.customer.aggregate({ _sum: { walletBalance: true } }),
        db.booking.findMany({
          where: { status: "BOOKED", slotStart: { gte: now, lte: todayEnd } },
          select: { id: true },
        }),
        getZoneSettings(),
        db.customer.count(),
      ]);

    const activeSessionsCount = await db.session.count({ where: { status: "ACTIVE" } });
    const todayActivity = await db.session.findMany({
      where: { startedAt: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
      select: { startedAt: true, endedAt: true, status: true },
    });

    const standaloneToday = standaloneOrders
      .filter((o) => o.createdAt >= todayStart && o.createdAt <= todayEnd)
      .reduce((s, o) => s + o.total, 0);
    const todayRevenue = todayCompleted.reduce((s, x) => s + x.total, 0) + standaloneToday;

    const eligible = stations.filter((s) => s.status !== "MAINTENANCE").length;
    const occupancyPct = eligible > 0 ? Math.round((activeSessionsCount / eligible) * 100) : 0;

    const floor: FloorStation[] = stations.map((s) => {
      const active = s.sessions[0];
      return {
        id: s.id,
        name: s.name,
        type: s.type as FloorStation["type"],
        status: s.status as FloorStation["status"],
        hourlyRate: s.hourlyRate,
        activeSession: active
          ? {
              id: active.id,
              startedAt: active.startedAt.toISOString(),
              rateSnapshot: active.rateSnapshot,
              customerName: active.customer?.name ?? null,
              customerPhone: active.customer?.phone ?? null,
            }
          : null,
      };
    });

    const last7Days: DashboardPayload["last7Days"] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = addDays(todayStart, -i);
      const dayEnd = addDays(dayStart, 1);
      const rev =
        weekSessions
          .filter((s) => s.startedAt >= dayStart && s.startedAt < dayEnd)
          .reduce((sum, s) => sum + s.total, 0) +
        standaloneOrders
          .filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
          .reduce((sum, o) => sum + o.total, 0);
      last7Days.push({
        date: dayStart.toISOString().slice(0, 10),
        label: dayStart.toLocaleDateString("en-IN", { weekday: "short" }),
        revenue: Math.round(rev),
      });
    }

    // Empty hours today — the app's core promise
    const emptyHours: number[] = [];
    for (let h = settings.openHour; h < settings.closeHour; h++) {
      const hourStart = new Date(todayStart);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 3600_000);
      const hasActivity = todayActivity.some((s) => {
        const end = s.endedAt ?? (s.status === "ACTIVE" ? now : s.startedAt);
        return minutesOverlap(s.startedAt, end, hourStart, hourEnd) > 0;
      });
      if (!hasActivity) emptyHours.push(h);
    }

    const payload: DashboardPayload & { meta: { members: number } } = {
      stats: {
        todayRevenue: Math.round(todayRevenue),
        activeSessions: activeSessionsCount,
        occupancyPct,
        walletBalanceHeld: Math.round(walletAgg._sum.walletBalance ?? 0),
        upcomingBookingsToday: upcomingBookings.length,
      },
      floor,
      last7Days,
      emptyHours,
      now: now.toISOString(),
      meta: { members },
    };

    return NextResponse.json(payload);
  } catch (e) {
    return serverError(e);
  }
}
