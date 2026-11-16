"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Layers,
  Loader2,
  Plus,
  TrendingDown,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types";
import { fmtDate } from "@/lib/hours";
import { formatINR, formatINR2 } from "@/lib/money";

interface ExpenseRow {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
}

interface ExpensesPayload {
  expenses: ExpenseRow[];
  summary: { total: number; byCategory: { category: string; amount: number }[] };
  recent: ExpenseRow[];
}

const CAT_BADGE: Record<ExpenseCategory, string> = {
  RENT: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  SALARY: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  ELECTRICITY: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  INTERNET: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  OTHER: "border-white/20 bg-white/5 text-muted-foreground",
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ExpensesPage() {
  const [month, setMonth] = React.useState(currentMonth);
  const [data, setData] = React.useState<ExpensesPayload | null>(null);
  const [error, setError] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`/api/expenses?month=${month}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
      toast.error("Could not load expenses");
    }
  }, [month]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Expense deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Could not delete expense");
    }
  }

  const monthTotal = data?.summary.total ?? 0;
  const biggest = data?.summary.byCategory[0];
  const entries = data?.expenses.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Expenses</h1>
          <p className="text-sm text-muted-foreground">Rent, salary, biji bill — darek kharcha track karo</p>
        </div>
        <Button
          className="h-11 bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Expense
        </Button>
      </header>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 border-violet-500/30 bg-white/5"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[9rem] rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center font-display text-sm font-bold tracking-wide">
          {monthLabel(month)}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 border-violet-500/30 bg-white/5"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!data ? (
        error ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            Could not load expenses. <Button variant="link" onClick={load}>Retry</Button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl bg-white/5" />
          </div>
        )
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="This Month" value={formatINR(monthTotal)} icon={IndianRupee} accent="red" sub="Total kharcha" />
            <StatCard
              title="Biggest Category"
              value={biggest ? biggest.category : "—"}
              icon={TrendingDown}
              accent="amber"
              sub={biggest ? formatINR(biggest.amount) : "No expenses yet"}
            />
            <StatCard title="Entries" value={String(entries)} icon={Layers} accent="cyan" sub={`${monthLabel(month)}`} className="sm:col-span-1" />
          </section>

          {/* Category summary bars */}
          <GlassCard className="p-5">
            <h2 className="font-display text-base font-semibold tracking-wide">BY CATEGORY</h2>
            {data.summary.byCategory.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No expenses recorded this month yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.summary.byCategory.map((c) => {
                  const pct = monthTotal > 0 ? Math.round((c.amount / monthTotal) * 100) : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <Badge variant="outline" className={CAT_BADGE[c.category as ExpenseCategory] ?? CAT_BADGE.OTHER}>
                          {c.category}
                        </Badge>
                        <span className="font-semibold tabular">{formatINR2(c.amount)} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Month list */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold tracking-wide">{monthLabel(month).toUpperCase()} — {data.expenses.length} ENTRIES</h2>
              <span className="font-display text-sm font-bold text-red-300 tabular">−{formatINR(monthTotal)}</span>
            </div>
            {data.expenses.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No expenses this month.</p>
            ) : (
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto scroll-neon pr-1">
                {data.expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={CAT_BADGE[e.category as ExpenseCategory] ?? CAT_BADGE.OTHER}>
                          {e.category}
                        </Badge>
                        <p className="truncate text-sm font-medium">{e.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{fmtDate(e.date)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-semibold text-red-300 tabular">{formatINR2(e.amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setDeleteId(e.id)}
                        aria-label={`Delete ${e.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent across months */}
          <GlassCard variant="cyan" className="p-5">
            <h2 className="font-display text-base font-semibold tracking-wide">RECENT — ALL MONTHS</h2>
            {data.recent.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No expenses logged yet.</p>
            ) : (
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto scroll-neon pr-1">
                {data.recent.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={CAT_BADGE[e.category as ExpenseCategory] ?? CAT_BADGE.OTHER}>
                          {e.category}
                        </Badge>
                        <p className="truncate text-sm font-medium">{e.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{fmtDate(e.date)}</p>
                    </div>
                    <span className="shrink-0 font-semibold text-red-300 tabular">{formatINR2(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}

      <AddExpenseDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); load(); }} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="border-red-500/30 bg-[#0f1526]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the entry from your books.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 border-white/20 bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-red-500/90 text-white hover:bg-red-500"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddExpenseDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<ExpenseCategory>("OTHER");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(todayISO);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setCategory("OTHER");
      setAmount("");
      setDate(todayISO());
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, amount: Number(amount), date }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add expense");
      toast.success(`${title.trim()} logged — ${formatINR(Number(amount))}`);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Add Expense</DialogTitle>
          <DialogDescription>Kharcha note karo — rent, salary, light bill ane bija.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ex-title">Title</Label>
            <Input
              id="ex-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shop rent — March"
              className="border-violet-500/25 bg-white/5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-amount">Amount (₹)</Label>
              <Input
                id="ex-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="5000"
                inputMode="decimal"
                className="border-violet-500/25 bg-white/5"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-date">Date</Label>
            <Input
              id="ex-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-violet-500/25 bg-white/5"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || title.trim().length < 2 || !(Number(amount) > 0) || !date}
            className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add Expense
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
