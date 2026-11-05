"use client";

import * as React from "react";
import { Coffee, Download, Gamepad2, IndianRupee, Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtDate } from "@/lib/hours";
import { formatINR } from "@/lib/money";

interface ReportRow {
  label: string;
  gaming: number;
  fnb: number;
  memberships: number;
  total: number;
}

interface StationStat {
  stationId: string;
  name: string;
  type: string;
  sessions: number;
  revenue: number;
  busyMinutes: number;
  utilizationPct: number;
}

interface ReportPayload {
  range: string;
  from: string;
  to: string;
  rows: ReportRow[];
  stationStats: StationStat[];
  heatmap: { days: { date: string; label: string }[]; hours: number[]; cells: number[][] };
  split: { gaming: number; fnb: number; memberships: number; total: number };
}

export default function ReportsPage() {
  const [range, setRange] = React.useState("week");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = React.useState<ReportPayload | null>(null);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`/api/reports?range=${range}&date=${date}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
      toast.error("Could not load reports");
    }
  }, [range, date]);

  React.useEffect(() => {
    load();
  }, [load]);

  function exportCSV() {
    if (!data) return;
    const lines: string[] = [];
    lines.push("GAMINOS Report (" + data.range + ") " + data.from.slice(0, 10) + " to " + data.to.slice(0, 10));
    lines.push("");
    lines.push("Period,Gaming,F&B,Memberships,Total");
    for (const r of data.rows) lines.push(`"${r.label}",${r.gaming},${r.fnb},${r.memberships},${r.total}`);
    lines.push("");
    lines.push("Station,Type,Sessions,Revenue,Busy Minutes,Utilization %");
    for (const s of data.stationStats) lines.push(`"${s.name}",${s.type},${s.sessions},${s.revenue},${s.busyMinutes},${s.utilizationPct}`);
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaminos-report-${data.range}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const best = data?.stationStats[0];
  const worst = data?.stationStats.length ? data.stationStats[data.stationStats.length - 1] : undefined;

  const chartData = (data?.rows ?? []).map((r) => ({
    name: r.label,
    Gaming: r.gaming,
    "F&B": r.fnb,
    Memberships: r.memberships,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Reports</h1>
          <p className="text-sm text-muted-foreground">Which station, which hour, which rupee.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="bg-white/5">
              <TabsTrigger value="day" className="data-[state=active]:bg-violet-500/30">Day</TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-violet-500/30">Week</TabsTrigger>
              <TabsTrigger value="month" className="data-[state=active]:bg-violet-500/30">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-0.5">
            <Input id="rp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 border-violet-500/25 bg-white/5" aria-label="Report date" />
          </div>
          <Button variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10" onClick={exportCSV} disabled={!data}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      {!data ? (
        error ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">Could not load reports. <Button variant="link" onClick={load}>Retry</Button></GlassCard>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl bg-white/5" />
          </div>
        )
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Gaming Revenue" value={formatINR(data.split.gaming)} icon={Gamepad2} accent="purple" sub="Session fees" />
            <StatCard title="F&B Revenue" value={formatINR(data.split.fnb)} icon={Coffee} accent="amber" sub="Counter + orders" />
            <StatCard title="Memberships" value={formatINR(data.split.memberships)} icon={Users} accent="cyan" sub="Plans sold" />
            <StatCard title="Total" value={formatINR(data.split.total)} icon={IndianRupee} accent="green" sub={`${fmtDate(data.from)} → ${fmtDate(data.to)}`} />
          </section>

          {/* Revenue chart */}
          <GlassCard className="p-5">
            <h2 className="font-display text-base font-semibold tracking-wide">REVENUE — {data.range.toUpperCase()}</h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#8f97ae", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#8f97ae", fontSize: 10 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(139,92,246,0.08)" }}
                    contentStyle={{ background: "#101627", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 12, color: "#e7eaf3" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Gaming" stackId="rev" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="F&B" stackId="rev" fill="#f59e0b" />
                  <Bar dataKey="Memberships" stackId="rev" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Station stats */}
            <GlassCard className="p-5">
              <h2 className="font-display text-base font-semibold tracking-wide">PER-STATION PERFORMANCE</h2>
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto scroll-neon pr-1">
                {data.stationStats.map((s) => {
                  const isBest = best?.stationId === s.stationId && data.stationStats.length > 1;
                  const isWorst = worst?.stationId === s.stationId && data.stationStats.length > 1;
                  return (
                    <div
                      key={s.stationId}
                      className={
                        "rounded-xl border border-white/10 bg-white/[0.03] p-3 " +
                        (isBest ? "border-l-4 border-l-emerald-500" : isWorst ? "border-l-4 border-l-red-500" : "")
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold " + (TYPE_STYLES[s.type as keyof typeof TYPE_STYLES]?.badge ?? "")}>
                            {s.name}
                          </span>
                          {isBest ? <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">BEST</Badge> : null}
                          {isWorst ? <Badge className="border-red-500/40 bg-red-500/10 text-red-300">FOCUS</Badge> : null}
                        </div>
                        <span className="font-display text-sm font-bold tabular">{formatINR(s.revenue)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${s.utilizationPct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular">{s.utilizationPct}% util · {s.sessions} sessions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Split + heatmap */}
            <div className="space-y-6">
              <GlassCard className="p-5">
                <h2 className="font-display text-base font-semibold tracking-wide">REVENUE SPLIT</h2>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Gaming", value: data.split.gaming, color: "from-violet-600 to-violet-400" },
                    { label: "F&B", value: data.split.fnb, color: "from-amber-600 to-amber-400" },
                    { label: "Memberships", value: data.split.memberships, color: "from-cyan-600 to-cyan-400" },
                  ].map((s) => {
                    const pct = data.split.total > 0 ? Math.round((s.value / data.split.total) * 100) : 0;
                    return (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-semibold tabular">{formatINR(s.value)} · {pct}%</span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                          <div className={"h-full rounded-full bg-gradient-to-r " + s.color} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h2 className="font-display text-base font-semibold tracking-wide">PEAK-HOUR HEATMAP</h2>
                <p className="text-xs text-muted-foreground">Last 7 days · darker = busier · red = empty hour.</p>
                <div className="mt-3 overflow-x-auto scroll-neon">
                  <div className="min-w-[520px]">
                    <div className="flex gap-1 pl-14">
                      {data.heatmap.hours.map((h) => (
                        <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">{h}</div>
                      ))}
                    </div>
                    {data.heatmap.days.map((d, di) => (
                      <div key={d.date} className="mt-1 flex items-center gap-1">
                        <div className="w-14 shrink-0 text-right text-[10px] text-muted-foreground">{d.label}</div>
                        {data.heatmap.cells[di].map((m, hi) => (
                          <div
                            key={hi}
                            title={`${d.label} ${data.heatmap.hours[hi]}:00 — ${m} busy min${m === 0 ? " (EMPTY)" : ""}`}
                            className="h-7 flex-1 rounded"
                            style={
                              m === 0
                                ? { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }
                                : { background: `rgba(139,92,246,${0.08 + 0.85 * (m / 60)})` }
                            }
                          />
                        ))}
                      </div>
                    ))}
                    <div className="mt-2.5 flex items-center gap-2 pl-14">
                      <span className="text-[9px] text-muted-foreground">Empty</span>
                      <div className="h-2.5 w-24 rounded" style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.2), rgba(139,92,246,0.3), rgba(139,92,246,0.95))" }} />
                      <span className="text-[9px] text-muted-foreground">Packed</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
