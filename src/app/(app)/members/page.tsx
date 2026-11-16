"use client";

import * as React from "react";
import { Loader2, Plus, Search, Sparkles, Wallet } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtDate, fmtDateTime } from "@/lib/hours";
import { formatINR } from "@/lib/money";

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  walletBalance: number;
  loyaltyPoints: number;
  bonusMinutes: number;
  membershipsCount: number;
}

interface MemberDetail {
  customer: CustomerLite & { createdAt: string };
  txns: { id: string; amount: number; type: string; note: string | null; createdAt: string }[];
  sessions: { id: string; stationName: string; stationType: string; startedAt: string; endedAt: string | null; total: number; status: string }[];
  memberships: { id: string; planName: string; price: number; bonusMinutes: number; startsAt: string; expiresAt: string; isActive: boolean }[];
}

const TXN_STYLE: Record<string, string> = {
  RECHARGE: "border-emerald-500/40 text-emerald-300",
  SPEND: "border-red-500/40 text-red-300",
  BONUS: "border-cyan-500/40 text-cyan-300",
  REFUND: "border-amber-500/40 text-amber-300",
};

// Membership tier presets — mirror /api/membership server-side presets.
const TIER_PRESETS: Record<string, { planName: string; price: number; bonusMinutes: number }> = {
  SILVER: { planName: "Silver Membership", price: 299, bonusMinutes: 0 },
  GOLD: { planName: "Gold Membership", price: 599, bonusMinutes: 60 },
  PLATINUM: { planName: "Platinum Membership", price: 999, bonusMinutes: 180 },
};

const TIER_BADGE: Record<string, string> = {
  SILVER: "border-slate-400/40 bg-slate-400/10 text-slate-300",
  GOLD: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  PLATINUM: "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.35)]",
};

function tierOf(planName: string): string | null {
  const p = planName.toLowerCase();
  if (p.includes("platinum")) return "PLATINUM";
  if (p.includes("gold")) return "GOLD";
  if (p.includes("silver")) return "SILVER";
  return null;
}

export default function MembersPage() {
  const [q, setQ] = React.useState("");
  const [customers, setCustomers] = React.useState<CustomerLite[] | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCustomers(json.customers);
    } catch {
      toast.error("Could not load members");
    }
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Members & Wallet</h1>
          <p className="text-sm text-muted-foreground">Wallets, loyalty points & memberships</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Customer
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by phone or name…"
          className="border-violet-500/25 bg-white/5 pl-9"
          aria-label="Search members"
        />
      </div>

      {!customers ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />)}
        </div>
      ) : customers.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">No members found.</GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDetailId(c.id)}
              className="text-left"
              aria-label={`Open ${c.name}`}
            >
              <GlassCard className="p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {c.membershipsCount > 0 ? (
                    <Badge className="border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"><Sparkles className="mr-1 h-3 w-3" />Member</Badge>
                  ) : null}
                </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                  <Wallet className="h-3.5 w-3.5" /> {formatINR(c.walletBalance)}
                </span>
                <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
                  {c.loyaltyPoints} pts
                </span>
                {c.bonusMinutes > 0 ? (
                  <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                    {c.bonusMinutes} bonus min
                  </span>
                ) : null}
              </div>
              </GlassCard>
            </button>
          ))}
        </div>
      )}

      <AddCustomerDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); load(); }} />
      <MemberDrawer id={detailId} onClose={() => setDetailId(null)} onChanged={load} />
    </div>
  );
}

function AddCustomerDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setEmail("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add customer");
      toast.success(`${json.customer?.name} added`);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add customer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Add Customer</DialogTitle>
          <DialogDescription>Phone is the member ID — used for search & wallet.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mc-name">Name</Label>
            <Input id="mc-name" value={name} onChange={(e) => setName(e.target.value)} className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc-phone">Phone</Label>
            <Input id="mc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc-email">Email (optional)</Label>
            <Input id="mc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-violet-500/25 bg-white/5" />
          </div>
          <Button type="submit" disabled={busy || !name.trim() || phone.replace(/\D/g, "").length < 10} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add Customer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = React.useState<MemberDetail | null>(null);
  const [rechargeOpen, setRechargeOpen] = React.useState(false);
  const [membershipOpen, setMembershipOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/members/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setDetail(await res.json());
    } catch {
      toast.error("Could not load member");
    }
  }, [id]);

  React.useEffect(() => {
    setDetail(null);
    if (id) load();
  }, [id, load]);

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-violet-500/25 bg-[#0c1122] p-5 scroll-neon sm:max-w-md">
        <SheetHeader className="p-0">
          <SheetTitle className="font-display">{detail?.customer.name ?? "Member"}</SheetTitle>
          <SheetDescription>
            {detail ? `${detail.customer.phone}${detail.customer.email ? " · " + detail.customer.email : ""} · since ${fmtDate(detail.customer.createdAt)}` : "…"}
          </SheetDescription>
        </SheetHeader>

        {!detail ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 bg-white/5" />
            <Skeleton className="h-40 bg-white/5" />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Balance card */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Wallet balance</p>
                  <p className="font-display text-3xl font-extrabold text-amber-300">{formatINR(detail.customer.walletBalance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Loyalty</p>
                  <p className="font-display text-xl font-bold text-violet-300">{detail.customer.loyaltyPoints} pts</p>
                </div>
              </div>
              {detail.customer.bonusMinutes > 0 ? (
                <p className="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300">
                  {detail.customer.bonusMinutes} bonus minutes available — use them when starting a session
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90" onClick={() => setRechargeOpen(true)}>
                  <Wallet className="mr-1.5 h-3.5 w-3.5" /> Recharge
                </Button>
                <Button size="sm" variant="outline" className="flex-1 border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/10" onClick={() => setMembershipOpen(true)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Membership
                </Button>
              </div>
            </div>

            {/* Memberships */}
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Memberships</p>
              {detail.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">No memberships yet.</p>
              ) : (
                <div className="space-y-2">
                  {detail.memberships.map((m) => {
                    const expired = new Date(m.expiresAt).getTime() < Date.now();
                    const t = tierOf(m.planName);
                    return (
                      <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-medium">{m.planName}</span>
                            {t ? (
                              <Badge variant="outline" className={"shrink-0 text-[10px] " + (TIER_BADGE[t] ?? "")}>{t}</Badge>
                            ) : null}
                          </span>
                          {expired || !m.isActive ? (
                            <Badge variant="outline" className="shrink-0 border-red-500/40 text-red-300">Expired</Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 border-emerald-500/40 text-emerald-300">Active</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatINR(m.price)} · {m.bonusMinutes} bonus min · {fmtDate(m.startsAt)} → {fmtDate(m.expiresAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Wallet history */}
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet history</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto scroll-neon pr-1">
                {detail.txns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <Badge variant="outline" className={"text-[10px] " + (TXN_STYLE[t.type] ?? "")}>{t.type}</Badge>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{t.note ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className={"tabular text-sm font-semibold " + (t.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {t.amount >= 0 ? "+" : "−"}{formatINR(Math.abs(t.amount))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{fmtDateTime(t.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {detail.txns.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : null}
              </div>
            </section>

            {/* Session history */}
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent sessions</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto scroll-neon pr-1">
                {detail.sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{s.stationName}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDateTime(s.startedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-semibold">{formatINR(s.total)}</p>
                      <Badge variant="outline" className={"mt-0.5 text-[9px] " + (s.status === "COMPLETED" ? "border-emerald-500/40 text-emerald-300" : s.status === "ACTIVE" ? "border-amber-500/40 text-amber-300" : "border-white/20 text-muted-foreground")}>
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {detail.sessions.length === 0 ? <p className="text-sm text-muted-foreground">No sessions yet.</p> : null}
              </div>
            </section>
          </div>
        )}

        <RechargeDialog
          id={id}
          open={rechargeOpen}
          onClose={() => setRechargeOpen(false)}
          onDone={() => {
            setRechargeOpen(false);
            load();
            onChanged();
          }}
        />
        <MembershipDialog
          id={id}
          open={membershipOpen}
          onClose={() => setMembershipOpen(false)}
          onDone={() => {
            setMembershipOpen(false);
            load();
            onChanged();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function RechargeDialog({ id, open, onClose, onDone }: { id: string | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = React.useState("");
  const [bonus, setBonus] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAmount("");
      setBonus("");
      setMethod("CASH");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/members/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id, amount: Number(amount), bonusMinutes: Number(bonus) || 0, method }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Recharge failed");
      toast.success(
        `Wallet recharged — ${formatINR(json.customer?.walletBalance ?? 0)} balance`,
        {
          description:
            Number(bonus) > 0
              ? `${bonus} bonus minutes credited — total ${json.customer?.bonusMinutes ?? 0} min available`
              : undefined,
        }
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recharge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Recharge Wallet</DialogTitle>
          <DialogDescription>Bonus minutes are free play minutes — not wallet money.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rc-amount">Amount (₹)</Label>
            <Input id="rc-amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="500" inputMode="decimal" className="border-violet-500/25 bg-white/5" />
            <div className="flex gap-1.5">
              {[100, 200, 500, 1000].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" className="h-7 border-violet-500/30 text-xs" onClick={() => setAmount(String(v))}>₹{v}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-bonus">Bonus minutes</Label>
            <Input id="rc-bonus" value={bonus} onChange={(e) => setBonus(e.target.value.replace(/\D/g, ""))} placeholder="0" inputMode="numeric" className="border-violet-500/25 bg-white/5" />
            <div className="flex gap-1.5">
              {[30, 60, 120].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" className="h-7 border-cyan-500/30 text-xs" onClick={() => setBonus(String(v))}>{v} min</Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Paid by</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                {["CASH", "UPI", "CARD"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy || !(Number(amount) > 0)} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Recharge
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MembershipDialog({ id, open, onClose, onDone }: { id: string | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [tier, setTier] = React.useState("CUSTOM");
  const [planName, setPlanName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [bonus, setBonus] = React.useState("");
  const [months, setMonths] = React.useState("1");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTier("CUSTOM");
      setPlanName("");
      setPrice("");
      setBonus("");
      setMonths("1");
    }
  }, [open]);

  function applyTier(v: string) {
    setTier(v);
    const preset = TIER_PRESETS[v];
    if (preset) {
      // Auto-fill from preset — fields stay editable.
      setPlanName(preset.planName);
      setPrice(String(preset.price));
      setBonus(String(preset.bonusMinutes));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: id,
          tier: tier === "CUSTOM" ? undefined : tier,
          planName,
          price: Number(price),
          bonusMinutes: Number(bonus) || 0,
          months: Number(months),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not attach membership");
      toast.success(`Membership "${planName}" attached`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not attach membership");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Attach Membership</DialogTitle>
          <DialogDescription>Starts today, expires after the selected months.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tier preset</Label>
            <Select value={tier} onValueChange={applyTier}>
              <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                {Object.keys(TIER_PRESETS).map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                ))}
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mb-name">Plan name</Label>
            <Input id="mb-name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Gamer Pro — 90 Days" className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mb-price">Price (₹)</Label>
              <Input id="mb-price" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="999" inputMode="decimal" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-bonus">Bonus minutes</Label>
              <Input id="mb-bonus" value={bonus} onChange={(e) => setBonus(e.target.value.replace(/\D/g, ""))} placeholder="120" inputMode="numeric" className="border-violet-500/25 bg-white/5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                {["1", "3", "6", "12"].map((m) => <SelectItem key={m} value={m}>{m} month{m === "1" ? "" : "s"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy || !planName.trim() || !(Number(price) > 0)} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Attach Membership
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
