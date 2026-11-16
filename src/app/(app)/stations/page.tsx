"use client";

import * as React from "react";
import {
  BadgeIndianRupee,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatusDot } from "@/components/status-dot";
import { LiveCost, LiveTimer } from "@/components/live-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtTime, fmtDateTime } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import type { FloorStation } from "@/lib/types";

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
  walletBalance: number;
  loyaltyPoints: number;
}

interface OrderLine {
  id: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  status: string;
}

interface SessionDetail {
  session: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    rateSnapshot: number;
    station: { id: string; name: string; type: string; hourlyRate: number };
    customer: { id: string; name: string; phone: string; walletBalance: number; loyaltyPoints: number } | null;
    orders: OrderLine[];
  };
  live: { minutes: number; fee: number };
}

export default function StationsPage() {
  const [stations, setStations] = React.useState<FloorStation[] | null>(null);
  const [startFor, setStartFor] = React.useState<FloorStation | null>(null);
  const [billFor, setBillFor] = React.useState<FloorStation | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/stations", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStations(json.stations);
    } catch {
      toast.error("Could not load stations");
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function toggleMaintenance(station: FloorStation) {
    setBusyId(station.id);
    try {
      const res = await fetch("/api/stations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId: station.id, action: "TOGGLE_MAINTENANCE" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(
        res.status === 200 && json.station?.status === "MAINTENANCE"
          ? `${station.name} marked under maintenance`
          : `${station.name} is back online`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePause(station: FloorStation) {
    const active = station.activeSession;
    if (!active) return;
    setBusyId(station.id);
    const pausing = active.sessionStatus !== "PAUSED";
    try {
      const res = await fetch(`/api/sessions/${active.id}/${pausing ? "pause" : "resume"}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(pausing ? `${station.name} paused — timer frozen` : `${station.name} resumed`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const counts = React.useMemo(() => {
    const s = stations ?? [];
    return {
      free: s.filter((x) => x.status === "FREE").length,
      busy: s.filter((x) => x.status === "BUSY").length,
      maint: s.filter((x) => x.status === "MAINTENANCE").length,
    };
  }, [stations]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Stations</h1>
          <p className="text-sm text-muted-foreground">Walk-ins, live sessions & billing</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">{counts.free} free</Badge>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300">{counts.busy} busy</Badge>
          <Badge variant="outline" className="border-red-500/40 text-red-300">{counts.maint} maint.</Badge>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh" className="border-violet-500/30">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!stations ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stations.map((s) => (
            <StationCard
              key={s.id}
              station={s}
              busy={busyId === s.id}
              onStart={() => setStartFor(s)}
              onBill={() => setBillFor(s)}
              onToggleMaintenance={() => toggleMaintenance(s)}
              onTogglePause={() => togglePause(s)}
            />
          ))}
        </div>
      )}

      {/* Start session dialog */}
      <StartSessionDialog
        station={startFor}
        onClose={() => setStartFor(null)}
        onStarted={() => {
          setStartFor(null);
          load();
        }}
      />

      {/* Billing dialog */}
      <BillDialog
        station={billFor}
        onClose={() => setBillFor(null)}
        onEnded={() => {
          setBillFor(null);
          load();
        }}
      />
    </div>
  );
}

function StationCard({
  station,
  busy,
  onStart,
  onBill,
  onToggleMaintenance,
  onTogglePause,
}: {
  station: FloorStation;
  busy: boolean;
  onStart: () => void;
  onBill: () => void;
  onToggleMaintenance: () => void;
  onTogglePause: () => void;
}) {
  const style = TYPE_STYLES[station.type];
  const border =
    station.status === "BUSY"
      ? "border-amber-500/30"
      : station.status === "MAINTENANCE"
        ? "border-red-500/30"
        : "border-emerald-500/20";

  return (
    <GlassCard className={"flex flex-col p-5 " + border}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold">{station.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + style.badge}>
              {style.label}
            </span>
            <span className="text-xs text-muted-foreground">₹{station.hourlyRate}/hr</span>
          </div>
        </div>
        <StatusDot state={station.status} pulse={station.status === "BUSY"} />
      </div>

      {station.activeSession ? (
        <div className="mt-4 flex-1 space-y-1.5 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {station.activeSession.customerName ?? "Walk-in guest"}
            {station.activeSession.sessionStatus === "PAUSED" ? (
              <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">PAUSED</Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{station.activeSession.customerPhone} · from {fmtTime(station.activeSession.startedAt)}</p>
          <div className="flex items-center justify-between pt-1.5">
            <LiveTimer
              startedAt={station.activeSession.startedAt}
              pausedMinutes={station.activeSession.pausedMinutes ?? 0}
              pausedAt={station.activeSession.pausedAt ?? null}
              className="text-sm"
              prefix="⏱"
            />
            <LiveCost
              startedAt={station.activeSession.startedAt}
              rate={station.activeSession.rateSnapshot}
              pausedMinutes={station.activeSession.pausedMinutes ?? 0}
              pausedAt={station.activeSession.pausedAt ?? null}
              className="text-sm"
            />
          </div>
        </div>
      ) : station.status === "MAINTENANCE" ? (
        <div className="mt-4 flex-1 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300/90">
          Station is under maintenance. Resolve to make it bookable.
        </div>
      ) : (
        <div className="mt-4 flex-1 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs text-emerald-300/90">
          Ready for a walk-in session.
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {station.status === "FREE" ? (
          <>
            <Button
              className="h-11 flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90"
              onClick={onStart}
              disabled={busy}
            >
              <Zap className="mr-1.5 h-4 w-4" /> Start Session
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={onToggleMaintenance} disabled={busy} aria-label="Mark under maintenance">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            </Button>
          </>
        ) : station.status === "MAINTENANCE" ? (
          <Button variant="outline" className="h-11 flex-1 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" onClick={onToggleMaintenance} disabled={busy}>
            <Wrench className="mr-1.5 h-4 w-4" /> Resolve Maintenance
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-11 w-11 shrink-0",
                station.activeSession?.sessionStatus === "PAUSED"
                  ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              )}
              onClick={onTogglePause}
              disabled={busy}
              aria-label={station.activeSession?.sessionStatus === "PAUSED" ? "Resume session" : "Pause session"}
            >
              {station.activeSession?.sessionStatus === "PAUSED" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
              onClick={onBill}
            >
              <BadgeIndianRupee className="mr-1.5 h-4 w-4" /> End Session & Bill
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={onToggleMaintenance} disabled={busy} aria-label="Maintenance blocked while active">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>
    </GlassCard>
  );
}

function StartSessionDialog({
  station,
  onClose,
  onStarted,
}: {
  station: FloorStation | null;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [tab, setTab] = React.useState<"existing" | "new">("existing");
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<CustomerLite[]>([]);
  const [selected, setSelected] = React.useState<CustomerLite | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [planned, setPlanned] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!station) return;
    setTab("existing");
    setQ("");
    setResults([]);
    setSelected(null);
    setName("");
    setPhone("");
    setPlanned("");
  }, [station]);

  React.useEffect(() => {
    if (tab !== "existing" || !station) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setResults(json.customers ?? []);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab, station]);

  async function start() {
    if (!station) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { stationId: station.id };
      if (planned && Number(planned) > 0) body.plannedMinutes = Number(planned);
      if (tab === "existing" && selected) body.customerId = selected.id;
      else if (tab === "new") body.quickCustomer = { name, phone };

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not start session");
      toast.success(`${station.name} started for ${(json.session?.customer?.name as string) || "guest"}`, {
        description: json.rate?.ruleName ? `Rate ${formatINR(json.rate.rate)}/hr — ${json.rate.ruleName}` : `Rate ${formatINR(json.rate?.rate ?? station.hourlyRate)}/hr`,
      });
      onStarted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  const canStart = tab === "existing" ? !!selected : name.trim().length > 1 && phone.replace(/\D/g, "").length >= 10;

  return (
    <Dialog open={!!station} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-violet-500/25 bg-[#0f1526] scroll-neon sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Start Session — {station?.name}</DialogTitle>
          <DialogDescription>
            {station ? `${TYPE_STYLES[station.type].label} · ${formatINR(station.hourlyRate)}/hr base rate` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={tab === "existing" ? "default" : "outline"} size="sm" onClick={() => setTab("existing")}
            className={tab === "existing" ? "bg-violet-600" : "border-violet-500/30"}>
            <Users className="mr-1.5 h-4 w-4" /> Existing
          </Button>
          <Button variant={tab === "new" ? "default" : "outline"} size="sm" onClick={() => setTab("new")}
            className={tab === "new" ? "bg-violet-600" : "border-violet-500/30"}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Quick Add
          </Button>
        </div>

        {tab === "existing" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phone or name…" className="border-violet-500/25 bg-white/5 pl-9" />
            </div>
            <div className="max-h-52 space-y-1.5 overflow-y-auto scroll-neon pr-1">
              {results.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No members found — use Quick Add.</p>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className={
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors " +
                      (selected?.id === c.id
                        ? "border-violet-500/60 bg-violet-500/15"
                        : "border-white/10 bg-white/[0.03] hover:border-violet-500/30")
                    }
                  >
                    <span>
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.phone}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-xs text-amber-300">{formatINR(c.walletBalance)}</span>
                      <span className="block text-[10px] text-violet-300">{c.loyaltyPoints} pts</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qc-name">Name</Label>
              <Input id="qc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-phone">Phone</Label>
              <Input id="qc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" className="border-violet-500/25 bg-white/5" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="qc-planned">Planned minutes (optional)</Label>
          <Input id="qc-planned" value={planned} onChange={(e) => setPlanned(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 60" inputMode="numeric" className="border-violet-500/25 bg-white/5" />
        </div>

        <Button
          onClick={start}
          disabled={!canStart || busy}
          className="h-11 bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          {busy ? "Starting…" : "Start Session"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function BillDialog({
  station,
  onClose,
  onEnded,
}: {
  station: FloorStation | null;
  onClose: () => void;
  onEnded: () => void;
}) {
  const [detail, setDetail] = React.useState<SessionDetail | null>(null);
  const [discount, setDiscount] = React.useState("");
  const [pay, setPay] = React.useState({ UPI: "", CASH: "", CARD: "" });
  const [useWallet, setUseWallet] = React.useState(false);
  const [walletAmount, setWalletAmount] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    if (!station?.activeSession) return;
    try {
      const res = await fetch(`/api/sessions/${station.activeSession.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json: SessionDetail = await res.json();
      setDetail(json);
    } catch {
      toast.error("Could not load session bill");
    }
  }, [station]);

  React.useEffect(() => {
    if (!station) return;
    setDetail(null);
    setDiscount("");
    setPay({ UPI: "", CASH: "", CARD: "" });
    setUseWallet(false);
    setWalletAmount("");
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [station, load]);

  const liveMinutes = detail
    ? Math.max(1, Math.ceil(((detail.session.endedAt ? new Date(detail.session.endedAt).getTime() : now) - new Date(detail.session.startedAt).getTime()) / 60000))
    : 0;
  const liveFee = detail ? Math.round((detail.session.rateSnapshot * liveMinutes) / 60) : 0;
  const fnbTotal = detail ? detail.session.orders.reduce((s, o) => s + o.total, 0) : 0;
  const discountNum = Math.min(Number(discount) || 0, liveFee + fnbTotal);
  const due = Math.max(0, Math.round(liveFee + fnbTotal - discountNum));
  const walletNum = useWallet ? Math.min(Number(walletAmount) || 0, detail?.session.customer?.walletBalance ?? 0) : 0;
  const walletExcess = useWallet && (Number(walletAmount) || 0) > (detail?.session.customer?.walletBalance ?? 0);
  const allocated = (Number(pay.UPI) || 0) + (Number(pay.CASH) || 0) + (Number(pay.CARD) || 0) + walletNum;
  const remaining = due - allocated;
  const canConfirm = detail && remaining === 0 && !walletExcess && due >= 0;

  async function confirmEnd() {
    if (!detail) return;
    setBusy(true);
    try {
      const payments = (["UPI", "CASH", "CARD"] as const)
        .map((m) => ({ method: m, amount: Number(pay[m]) || 0 }))
        .filter((p) => p.amount > 0);
      const res = await fetch("/api/sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: detail.session.id,
          discount: discountNum,
          payments,
          walletAmount: walletNum,
          walletCustomerId: detail.session.customer?.id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Billing failed");
      toast.success(`Billed ${formatINR(json.bill?.total ?? due)} — ${json.bill?.loyaltyEarned ?? 0} loyalty points earned`, {
        description: `${detail.session.station.name} is now free`,
      });
      onEnded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Billing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!station} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-violet-500/25 bg-[#0f1526] scroll-neon sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">End Session & Bill — {detail?.session.station.name ?? station?.name}</DialogTitle>
          <DialogDescription>Started {detail ? fmtDateTime(detail.session.startedAt) : "…"}</DialogDescription>
        </DialogHeader>

        {!detail ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 bg-white/5" />
            <Skeleton className="h-16 bg-white/5" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Line items */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill lines</p>
              <div className="flex items-center justify-between text-sm">
                <span>
                  {detail.session.station.name} · {liveMinutes} min × {formatINR(detail.session.rateSnapshot)}/hr
                </span>
                <span className="tabular font-semibold">{formatINR(liveFee)}</span>
              </div>
              {detail.session.orders.flatMap((o) =>
                o.items.map((it, i) => (
                  <div key={o.id + "-" + i} className="mt-1.5 flex items-center justify-between text-sm text-muted-foreground">
                    <span>🍿 {it.name} × {it.qty}</span>
                    <span className="tabular">{formatINR(it.price * it.qty)}</span>
                  </div>
                ))
              )}
              {fnbTotal > 0 ? (
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">F&B total</span>
                  <span className="tabular font-semibold">{formatINR(fnbTotal)}</span>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">No F&B on this bill</p>
              )}
              <Separator className="my-2.5 bg-white/10" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Discount</span>
                <span className="tabular text-emerald-300">− {formatINR(discountNum)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-display text-sm font-semibold">TOTAL DUE</span>
                <span className="font-display text-2xl font-extrabold neon-text tabular">{formatINR(due)}</span>
              </div>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label htmlFor="bill-discount">Discount (₹)</Label>
              <div className="flex gap-2">
                <Input id="bill-discount" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" inputMode="decimal" className="border-violet-500/25 bg-white/5" />
                {[0, 20, 50].map((d) => (
                  <Button key={d} type="button" variant="outline" size="sm" className="border-violet-500/30" onClick={() => setDiscount(String(d))}>
                    ₹{d}
                  </Button>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment — split allowed</p>
              {(["UPI", "CASH", "CARD"] as const).map((m) => (
                <div key={m} className="flex items-center gap-3">
                  <Label htmlFor={"pay-" + m} className="w-14 text-sm">{m}</Label>
                  <Input
                    id={"pay-" + m}
                    value={pay[m]}
                    onChange={(e) => setPay((p) => ({ ...p, [m]: e.target.value.replace(/[^\d.]/g, "") }))}
                    placeholder="0"
                    inputMode="decimal"
                    className="border-violet-500/25 bg-white/5"
                  />
                </div>
              ))}
              {detail.session.customer ? (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-amber-200">Use wallet ({formatINR(detail.session.customer.walletBalance)} available)</Label>
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => {
                        setUseWallet(e.target.checked);
                        if (e.target.checked) setWalletAmount(String(Math.min(due, Math.round(detail.session.customer!.walletBalance))));
                        else setWalletAmount("");
                      }}
                      className="h-4 w-4 accent-violet-500"
                      aria-label="Debit wallet"
                    />
                  </div>
                  {useWallet ? (
                    <div className="mt-2 space-y-1.5">
                      <Input
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(e.target.value.replace(/[^\d.]/g, ""))}
                        placeholder="Wallet debit amount"
                        inputMode="decimal"
                        className="border-amber-500/30 bg-white/5"
                      />
                      {walletExcess ? (
                        <p className="text-xs font-medium text-red-400">Insufficient balance — {formatINR(detail.session.customer.walletBalance)} available</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Remaining to allocate</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-cyan-300"
                  onClick={() => {
                    if (remaining > 0) {
                      setPay((p) => ({ ...p, UPI: String((Number(p.UPI) || 0) + remaining) }));
                    }
                  }}
                  disabled={remaining <= 0}
                >
                  + settle via UPI
                </Button>
              </div>
              <p className={"text-sm font-semibold tabular " + (remaining === 0 ? "text-emerald-400" : remaining > 0 ? "text-amber-400" : "text-red-400")}>
                {formatINR(remaining)} {remaining === 0 ? "— balanced ✓" : remaining > 0 ? "still due" : "overpaid"}
              </p>
            </div>

            <Button
              onClick={confirmEnd}
              disabled={!canConfirm || busy}
              className="h-12 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-display text-sm font-bold tracking-wide text-white hover:opacity-90"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {busy ? "Closing…" : `Confirm & Bill ${formatINR(due)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
