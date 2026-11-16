"use client";

import * as React from "react";
import { Calculator, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAYS, RULE_KIND_LABEL, RULE_KIND_STYLES, TYPE_STYLES } from "@/lib/ui-meta";
import { hourLabel } from "@/lib/hours";
import { formatINR } from "@/lib/money";
import { STATION_TYPES, RULE_KINDS } from "@/lib/types";
import type { StationType, RuleKind } from "@/lib/types";

interface Rule {
  id: string;
  stationType: string;
  name: string;
  ratePerHour: number;
  daysMask: number;
  startHour: number;
  endHour: number;
  kind: string;
  isActive: boolean;
}

interface Preview {
  rate: number;
  kind: string | null;
  ruleName: string | null;
  baseRate: number;
  matches: { name: string; kind: string; ratePerHour: number }[];
}

// Display rank: P1 = applied first / wins (Student), P4 = last resort (Peak).
// Engine sort is by RULE_PRIORITY weight — these labels express the same order.
const PRIORITY_RANK: Record<string, number> = { STUDENT: 1, HAPPYHOUR: 2, OFFPEAK: 3, PEAK: 4 };

export default function PricingPage() {
  const [rules, setRules] = React.useState<Rule[] | null>(null);
  const [editing, setEditing] = React.useState<Rule | "new" | null>(null);
  const [previewType, setPreviewType] = React.useState<StationType>("PC");
  const [previewDate, setPreviewDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [previewTime, setPreviewTime] = React.useState("15:00");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/pricing/rules", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setRules((await res.json()).rules);
    } catch {
      toast.error("Could not load pricing rules");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const t = setTimeout(async () => {
      setPreviewBusy(true);
      try {
        const dt = new Date(previewDate + "T" + previewTime + ":00");
        const res = await fetch(
          `/api/pricing/preview?stationType=${previewType}&datetime=${encodeURIComponent(dt.toISOString())}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error();
        setPreview(await res.json());
      } catch {
        setPreview(null);
      } finally {
        setPreviewBusy(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [previewType, previewDate, previewTime]);

  async function toggleRule(rule: Rule) {
    try {
      const res = await fetch(`/api/pricing/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${rule.name} ${!rule.isActive ? "activated" : "paused"}`);
      load();
    } catch {
      toast.error("Could not update rule");
    }
  }

  async function deleteRule(rule: Rule) {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      const res = await fetch(`/api/pricing/rules/${rule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Rule deleted");
      load();
    } catch {
      toast.error("Could not delete rule");
    }
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, Rule[]>();
    for (const t of STATION_TYPES) map.set(t, []);
    for (const r of rules ?? []) {
      if (!map.has(r.stationType)) map.set(r.stationType, []);
      map.get(r.stationType)!.push(r);
    }
    return map;
  }, [rules]);

  const dayNames = (mask: number) =>
    DAYS.filter((_, i) => (mask & (1 << i)) !== 0).join(", ");

  const dayNameForDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long" });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Pricing Engine</h1>
          <p className="text-sm text-muted-foreground">
            Rules apply automatically — highest priority wins: Student &gt; Happy Hour &gt; Off-Peak &gt; Peak &gt; base rate.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Chip numbers = apply order: <span className="font-semibold text-violet-300">P1 wins first</span>, P4 is the fallback tier.</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90" onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> New Rule
        </Button>
      </header>

      {/* Rate preview calculator */}
      <GlassCard variant="cyan" className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5">
            <Calculator className="h-5 w-5 text-cyan-300" aria-hidden />
          </div>
          <div>
            <p className="font-display text-sm font-semibold tracking-wide text-cyan-200">RATE PREVIEW CALCULATOR</p>
            <p className="text-xs text-muted-foreground">Pick a station type & moment — see exactly what the customer pays.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Station type</Label>
            <Select value={previewType} onValueChange={(v) => setPreviewType(v as StationType)}>
              <SelectTrigger className="border-cyan-500/25 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent className="border-cyan-500/25 bg-[#0f1526]">
                {STATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_STYLES[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-date">Date</Label>
            <Input id="pv-date" type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} className="border-cyan-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-time">Time</Label>
            <Input id="pv-time" type="time" value={previewTime} onChange={(e) => setPreviewTime(e.target.value)} className="border-cyan-500/25 bg-white/5" />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          {previewBusy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</p>
          ) : preview ? (
            <>
              <p className="text-xs text-muted-foreground">
                {dayNameForDate(previewDate)} {previewTime} on {TYPE_STYLES[previewType].label} →{" "}
                <span className="font-semibold text-cyan-300">{preview.ruleName ?? "Base station rate"}</span>
              </p>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold neon-text">{formatINR(preview.rate)}/hr</span>
                {preview.kind ? (
                  <Badge className={"border " + RULE_KIND_STYLES[preview.kind as RuleKind]}>{RULE_KIND_LABEL[preview.kind as RuleKind]}</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">Base: {formatINR(preview.baseRate)}/hr</span>
              </p>
              {preview.matches.length > 1 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Also matched: {preview.matches.slice(1).map((m) => `${m.name} (${formatINR(m.ratePerHour)}/hr)`).join(" · ")} — lower priority, not applied.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pick a station type to preview the rate.</p>
          )}
        </div>
      </GlassCard>

      {/* Rules grouped by station type */}
      {!rules ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {STATION_TYPES.map((t) => {
            const list = grouped.get(t) ?? [];
            return (
              <GlassCard key={t} className="p-5">
                <div className="flex items-center justify-between">
                  <span className={"inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider " + TYPE_STYLES[t].badge}>
                    {TYPE_STYLES[t].label}
                  </span>
                  <span className="text-xs text-muted-foreground">{list.length} rule{list.length === 1 ? "" : "s"}</span>
                </div>
                {list.length === 0 ? (
                  <p className="mt-4 text-xs text-muted-foreground">No rules — base rate applies.</p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {list.map((r) => (
                      <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              {r.name}
                              <Badge className={"border text-[10px] " + RULE_KIND_STYLES[r.kind as RuleKind]}>
                                {RULE_KIND_LABEL[r.kind as RuleKind]} · P{PRIORITY_RANK[r.kind] ?? "—"}
                              </Badge>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatINR(r.ratePerHour)}/hr · {dayNames(r.daysMask)} · {hourLabel(r.startHour)} – {hourLabel(r.endHour === 24 ? 23 : r.endHour).replace(":00", ":59")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={r.isActive} onCheckedChange={() => toggleRule(r)} aria-label={`Toggle ${r.name}`} />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(r)} aria-label="Edit rule">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:bg-red-500/10" onClick={() => deleteRule(r)} aria-label="Delete rule">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      <RuleDialog
        open={!!editing}
        rule={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

function RuleDialog({
  open,
  rule,
  onClose,
  onSaved,
}: {
  open: boolean;
  rule: Rule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [stationType, setStationType] = React.useState<StationType>("PS5");
  const [kind, setKind] = React.useState<RuleKind>("HAPPYHOUR");
  const [rate, setRate] = React.useState("");
  const [days, setDays] = React.useState<number>(127);
  const [startHour, setStartHour] = React.useState("14");
  const [endHour, setEndHour] = React.useState("17");
  const [isActive, setIsActive] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (rule) {
      setName(rule.name);
      setStationType(rule.stationType as StationType);
      setKind(rule.kind as RuleKind);
      setRate(String(rule.ratePerHour));
      setDays(rule.daysMask);
      setStartHour(String(rule.startHour));
      setEndHour(String(rule.endHour));
      setIsActive(rule.isActive);
    } else {
      setName("");
      setStationType("PS5");
      setKind("HAPPYHOUR");
      setRate("");
      setDays(127);
      setStartHour("14");
      setEndHour("17");
      setIsActive(true);
    }
  }, [open, rule]);

  function toggleDay(i: number) {
    setDays((d) => d ^ (1 << i));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        name,
        stationType,
        kind,
        ratePerHour: Number(rate),
        daysMask: days,
        startHour: Number(startHour),
        endHour: Number(endHour),
        isActive,
      };
      const res = await fetch(rule ? `/api/pricing/rules/${rule.id}` : "/api/pricing/rules", {
        method: rule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(rule ? "Rule updated" : "Rule created");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-violet-500/25 bg-[#0f1526] scroll-neon sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{rule ? "Edit Rule" : "New Pricing Rule"}</DialogTitle>
          <DialogDescription>Apply order: Student (P1) &gt; Happy Hour (P2) &gt; Off-Peak (P3) &gt; Peak (P4). Lower number wins.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend Night Peak" className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Station type</Label>
              <Select value={stationType} onValueChange={(v) => setStationType(v as StationType)}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  {STATION_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_STYLES[t].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as RuleKind)}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  {RULE_KINDS.map((k) => <SelectItem key={k} value={k}>{RULE_KIND_LABEL[k]} (P{PRIORITY_RANK[k]})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-rate">Rate per hour (₹)</Label>
            <Input id="rule-rate" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} placeholder="90" inputMode="decimal" className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                    (days & (1 << i))
                      ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-violet-500/30"
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start hour</Label>
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-56 border-violet-500/25 bg-[#0f1526]">
                  {hourOptions.map((h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>End hour</Label>
              <Select value={endHour} onValueChange={setEndHour}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-56 border-violet-500/25 bg-[#0f1526]">
                  {[...hourOptions, 24].map((h) => (
                    <SelectItem key={h} value={String(h)}>{h === 24 ? "12:00 AM (midnight)" : hourLabel(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <Label className="text-sm">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button type="submit" disabled={busy || !name.trim() || !(Number(rate) > 0)} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {rule ? "Save Changes" : "Create Rule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
