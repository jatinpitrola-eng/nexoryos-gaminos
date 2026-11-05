"use client";

import * as React from "react";
import {
  Activity,
  CalendarDays,
  Clock,
  Gamepad2,
  IndianRupee,
  RefreshCw,
  Wallet,
  Zap,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/stat-card";
import { StatusDot } from "@/components/status-dot";
import { LiveCost, LiveTimer } from "@/components/live-timer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtTime, hourLabel } from "@/lib/hours";
import { formatINR } from "@/lib/money";
import type { DashboardPayload, FloorStation } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [members, setMembers] = React.useState(0);
  const [error, setError] = React.useState(false);
  const [clock, setClock] = React.useState<string>("");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = (await res.json()) as DashboardPayload & { meta: { members: number } };
      setData(json);
      setMembers(json.meta?.members ?? 0);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    load();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setClock(new Date().toLocaleTimeString("en-IN", { hour12: true })), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const maxRev = Math.max(1, ...(data?.last7Days.map((d) => d.revenue) ?? [1]));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Live Dashboard</h1>
          <p className="text-sm text-muted-foreground">Floor status, revenue & empty hours — updated live.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tabular text-cyan-300">
            {clock || "--:--"}
          </span>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh" className="border-violet-500/30">
            <RefreshCw className={"h-4 w-4" + (error ? " text-red-400" : "")} />
          </Button>
        </div>
      </header>

      {!data && !error ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : null}

      {error && !data ? (
        <GlassCard className="p-8 text-center">
          <p className="text-muted-foreground">Could not load the dashboard.</p>
          <Button className="mt-4" onClick={load}>Retry</Button>
        </GlassCard>
      ) : null}

      {data ? (
        <>
          {/* Stats */}
          <section aria-label="Key stats" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard title="Today's Revenue" value={formatINR(data.stats.todayRevenue)} icon={IndianRupee} accent="purple" />
            <StatCard title="Active Sessions" value={data.stats.activeSessions} icon={Zap} accent="cyan" sub="Running now" />
            <StatCard
              title="Occupancy"
              value={`${data.stats.occupancyPct}%`}
              icon={Activity}
              accent="green"
              sub={`${data.stats.activeSessions} of ${data.floor.filter((f) => f.status !== "MAINTENANCE").length} stations live`}
            />
            <StatCard title="Wallet Balance Held" value={formatINR(data.stats.walletBalanceHeld)} icon={Wallet} accent="amber" sub={`Across ${members} members`} />
            <StatCard title="Upcoming Bookings" value={data.stats.upcomingBookingsToday} icon={CalendarDays} accent="red" sub="Rest of today" className="col-span-2 lg:col-span-1" />
          </section>

          {/* Empty hours — core promise */}
          <GlassCard variant="cyan" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5">
                <Clock className="h-5 w-5 text-cyan-300" aria-hidden />
              </div>
              <div>
                <p className="font-display text-sm font-semibold tracking-wide text-cyan-200">EMPTY HOURS TODAY</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {data.emptyHours.length === 0
                    ? "Fully booked — every hour is earning. 🎯"
                    : data.emptyHours.map(hourLabel).join(" · ")}
                </p>
              </div>
            </div>
            {data.emptyHours.length > 0 ? (
              <p className="text-xs text-cyan-300/80 sm:text-right">
                Push a student combo or happy-hour post to fill these hours.
              </p>
            ) : null}
          </GlassCard>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            {/* Floor view */}
            <section aria-label="Live floor view" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold tracking-wide">LIVE FLOOR VIEW</h2>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><StatusDot state="FREE" pulse={false} /> Free</span>
                  <span className="flex items-center gap-1.5"><StatusDot state="BUSY" /> Busy</span>
                  <span className="flex items-center gap-1.5"><StatusDot state="MAINTENANCE" pulse={false} /> Maintenance</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                {data.floor.map((s) => (
                  <StationTile key={s.id} station={s} />
                ))}
              </div>
            </section>

            {/* 7-day chart */}
            <section aria-label="Last 7 days revenue">
              <GlassCard className="p-5">
                <h2 className="font-display text-base font-semibold tracking-wide">LAST 7 DAYS</h2>
                <p className="text-xs text-muted-foreground">Sessions + counter sales</p>
                <div className="mt-5 flex h-44 items-end gap-2">
                  {data.last7Days.map((d, i) => {
                    const isToday = i === data.last7Days.length - 1;
                    const h = Math.max(4, Math.round((d.revenue / maxRev) * 100));
                    return (
                      <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1.5" title={`${d.label}: ${formatINR(d.revenue)}`}>
                        <span className="text-[10px] tabular text-muted-foreground">{d.revenue > 0 ? formatINR(d.revenue).replace("₹", "₹") : ""}</span>
                        <div
                          className={
                            "w-full rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-400 transition-all " +
                            (isToday ? "opacity-100 shadow-[0_0_14px_rgba(34,211,238,0.45)]" : "opacity-60")
                          }
                          style={{ height: `${h}%` }}
                        />
                        <span className={"text-xs " + (isToday ? "font-semibold text-cyan-300" : "text-muted-foreground")}>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StationTile({ station }: { station: FloorStation }) {
  const style = TYPE_STYLES[station.type];
  const border =
    station.status === "BUSY"
      ? "border-amber-500/30"
      : station.status === "MAINTENANCE"
        ? "border-red-500/30"
        : "border-emerald-500/20";

  return (
    <GlassCard className={"p-3.5 " + border}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-display text-sm font-semibold">{station.name}</p>
        <StatusDot state={station.status} pulse={station.status === "BUSY"} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + style.badge}>
          {station.type}
        </span>
        <span className="text-[10px] text-muted-foreground">₹{station.hourlyRate}/hr</span>
      </div>
      {station.activeSession ? (
        <div className="mt-2.5 space-y-1 border-t border-white/5 pt-2.5">
          <p className="truncate text-xs font-medium">{station.activeSession.customerName ?? "Walk-in guest"}</p>
          <p className="flex items-center gap-1 text-xs">
            <Zap className="h-3 w-3 text-cyan-400" aria-hidden />
            <LiveTimer startedAt={station.activeSession.startedAt} className="text-xs" />
          </p>
          <p className="flex items-center gap-1 text-xs">
            <Gamepad2 className="h-3 w-3 text-emerald-400" aria-hidden />
            <LiveCost startedAt={station.activeSession.startedAt} rate={station.activeSession.rateSnapshot} className="text-xs" />
          </p>
          <p className="text-[10px] text-muted-foreground">Started {fmtTime(station.activeSession.startedAt)}</p>
        </div>
      ) : station.status === "MAINTENANCE" ? (
        <p className="mt-2.5 border-t border-white/5 pt-2.5 text-[11px] text-red-300/80">Under maintenance</p>
      ) : (
        <p className="mt-2.5 border-t border-white/5 pt-2.5 text-[11px] text-emerald-300/80">Ready for walk-in</p>
      )}
    </GlassCard>
  );
}
