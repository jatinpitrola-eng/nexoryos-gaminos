"use client";

import * as React from "react";
import { Loader2, Lock, PlayCircle, Timer } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDateTime } from "@/lib/hours";
import { formatINR } from "@/lib/money";

interface Shift {
  id: string;
  staffName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  systemTotal: number | null;
  note: string | null;
}

interface Totals {
  cashSessionPayments: number;
  walletRecharges: number;
  standaloneFnB: number;
  systemTotal: number;
}

export default function ShiftsPage() {
  const [data, setData] = React.useState<{ open: Shift | null; history: Shift[]; totals: Totals | null } | null>(null);
  const [staffName, setStaffName] = React.useState("");
  const [openingCash, setOpeningCash] = React.useState("2000");
  const [openBusy, setOpenBusy] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [, setTick] = React.useState(0);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/shifts", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Could not load shifts");
    }
  }, []);

  React.useEffect(() => {
    load();
    const t1 = setInterval(load, 30000);
    const t2 = setInterval(() => setTick((x) => x + 1), 30000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [load]);

  async function openShift() {
    setOpenBusy(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName, openingCash: Number(openingCash) || 0 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not open shift");
      toast.success(`Shift opened for ${staffName}`);
      setStaffName("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open shift");
    } finally {
      setOpenBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-xl font-bold sm:text-2xl">Shifts</h1>
        <p className="text-sm text-muted-foreground">Cash control at open & close — counted vs system.</p>
      </header>

      {!data ? (
        <Skeleton className="h-48 rounded-2xl bg-white/5" />
      ) : data.open ? (
        <GlassCard variant="cyan" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
                <Timer className="h-4 w-4" /> SHIFT RUNNING
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold">{data.open.staffName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Opened {fmtDateTime(data.open.openedAt)} · opening cash {formatINR(data.open.openingCash)}
              </p>
            </div>
            <Button variant="outline" className="h-11 border-amber-500/50 text-amber-200 hover:bg-amber-500/10" onClick={() => setCloseOpen(true)}>
              <Lock className="mr-1.5 h-4 w-4" /> Close Shift
            </Button>
          </div>
          {data.totals ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TotalTile label="Cash session payments" value={formatINR(data.totals.cashSessionPayments)} />
              <TotalTile label="Wallet recharges" value={formatINR(data.totals.walletRecharges)} />
              <TotalTile label="Counter F&B" value={formatINR(data.totals.standaloneFnB)} />
              <TotalTile label="System total" value={formatINR(data.totals.systemTotal)} highlight />
            </div>
          ) : null}
        </GlassCard>
      ) : (
        <GlassCard className="p-5 sm:p-6">
          <p className="font-display text-base font-semibold">No open shift</p>
          <p className="mt-1 text-sm text-muted-foreground">Open a shift at the counter start — cash is tracked till close.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sh-staff">Staff name</Label>
              <Input id="sh-staff" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="e.g. Ravi" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sh-cash">Opening cash (₹ float)</Label>
              <Input id="sh-cash" value={openingCash} onChange={(e) => setOpeningCash(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="flex items-end">
              <Button onClick={openShift} disabled={openBusy || !staffName.trim()} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
                {openBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} Open Shift
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* History */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold tracking-wide">SHIFT HISTORY</h2>
        <div className="max-h-96 overflow-y-auto rounded-2xl border border-violet-500/15 scroll-neon">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-[#0c1122] text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Closed</th>
                <th className="px-4 py-3 text-right">Opening</th>
                <th className="px-4 py-3 text-right">Counted</th>
                <th className="px-4 py-3 text-right">System</th>
                <th className="px-4 py-3 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {(data?.history ?? []).map((s) => {
                const diff = s.closingCash != null && s.systemTotal != null ? Math.round(s.closingCash - s.systemTotal) : null;
                return (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{s.staffName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(s.openedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.closedAt ? fmtDateTime(s.closedAt) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular">{formatINR(s.openingCash)}</td>
                    <td className="px-4 py-3 text-right tabular">{s.closingCash != null ? formatINR(s.closingCash) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular">{s.systemTotal != null ? formatINR(s.systemTotal) : "—"}</td>
                    <td className={"px-4 py-3 text-right font-semibold tabular " + (diff == null ? "" : diff === 0 ? "text-emerald-400" : "text-red-400")}>
                      {diff == null ? "—" : (diff > 0 ? "+" : "") + formatINR(diff).replace("₹-", "−₹")}
                    </td>
                  </tr>
                );
              })}
              {(data?.history ?? []).length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No closed shifts yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CloseShiftDialog
        open={closeOpen}
        totals={data?.totals ?? null}
        openedAt={data?.open?.openedAt ?? null}
        onClose={() => setCloseOpen(false)}
        onClosed={() => {
          setCloseOpen(false);
          load();
        }}
      />
    </div>
  );
}

function TotalTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border p-3 " + (highlight ? "border-cyan-500/40 bg-cyan-500/10" : "border-white/10 bg-white/[0.03]")}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={"mt-1 font-display text-lg font-bold tabular " + (highlight ? "text-cyan-300" : "")}>{value}</p>
    </div>
  );
}

function CloseShiftDialog({
  open,
  totals,
  openedAt,
  onClose,
  onClosed,
}: {
  open: boolean;
  totals: Totals | null;
  openedAt: string | null;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [counted, setCounted] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setCounted("");
  }, [open]);

  const countedNum = Number(counted) || 0;
  const difference = totals ? Math.round(countedNum - totals.systemTotal) : 0;

  async function close() {
    setBusy(true);
    try {
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countedCash: countedNum }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Close failed");
      const diff = json.difference as number;
      if (diff === 0) toast.success("Shift closed — cash balanced ✓");
      else toast.error(`Shift closed with ${formatINR(Math.abs(diff))} ${diff > 0 ? "over" : "short"}`);
      onClosed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Close Shift</DialogTitle>
          <DialogDescription>Since {openedAt ? fmtDateTime(openedAt) : "…"}</DialogDescription>
        </DialogHeader>
        {totals ? (
          <div className="space-y-3">
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cash session payments</span><span className="tabular">{formatINR(totals.cashSessionPayments)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Wallet recharges (cash in)</span><span className="tabular">{formatINR(totals.walletRecharges)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Counter F&B sales</span><span className="tabular">{formatINR(totals.standaloneFnB)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold">
                <span>System total</span>
                <span className="font-display tabular text-cyan-300">{formatINR(totals.systemTotal)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-count">Counted cash (₹)</Label>
              <Input id="cs-count" value={counted} onChange={(e) => setCounted(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="Drawer count" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className={"rounded-xl border px-3 py-2.5 text-sm font-semibold " + (counted === "" ? "border-white/10 text-muted-foreground" : difference === 0 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300")}>
              {counted === ""
                ? "Enter the counted cash to see the difference."
                : difference === 0
                  ? "Balanced ✓ — counted cash matches the system."
                  : `Difference: ${difference > 0 ? "+" : "−"}${formatINR(Math.abs(difference))} (${difference > 0 ? "over" : "short"})`}
            </div>
            <Button onClick={close} disabled={busy || counted === ""} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />} Close Shift
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading totals…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
