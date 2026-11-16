"use client";

import * as React from "react";
import { SessionProvider, useSession } from "next-auth/react";
import {
  CalendarDays,
  Crown,
  Gamepad2,
  IndianRupee,
  Loader2,
  Medal,
  Plus,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATION_TYPES, TOURNAMENT_STATUSES, type StationType } from "@/lib/types";
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtDateTime } from "@/lib/hours";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

// ---------- types ----------

interface Winner {
  position: number;
  name: string;
}

interface EntryItem {
  id: string;
  name: string;
  phone: string | null;
  customerId: string | null;
  feePaid: boolean;
  position: number | null;
}

interface TournamentSummary {
  id: string;
  name: string;
  game: string;
  stationType: string;
  startsAt: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  status: string;
  notes: string | null;
  entryCount: number;
  paidCount: number;
  winners: Winner[];
  entries: EntryItem[];
}

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
  walletBalance: number;
  loyaltyPoints: number;
}

// ---------- constants ----------

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
  ONGOING: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  CANCELLED: "border-red-500/40 bg-red-500/15 text-red-300",
};

const GAME_QUICK_PICKS = ["Valorant", "BGMI", "FC 25", "Call of Duty"];

const PLACE_STYLE: Record<number, { icon: typeof Crown; iconClass: string; rowClass: string }> = {
  1: {
    icon: Crown,
    iconClass: "text-amber-300",
    rowClass: "border-amber-500/30 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.15)]",
  },
  2: { icon: Medal, iconClass: "text-slate-300", rowClass: "border-white/10 bg-white/5" },
  3: { icon: Medal, iconClass: "text-amber-500", rowClass: "border-white/10 bg-white/5" },
};

const PLACE_LABEL: Record<number, string> = { 1: "Winner", 2: "Runner-up", 3: "Semi-finalist" };

const EMPTY_FORM = {
  name: "",
  game: "",
  stationType: "",
  startsAt: "",
  entryFee: "",
  prizePool: "",
  maxPlayers: "16",
  notes: "",
};

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ---------- page ----------

export default function TournamentsPage() {
  return (
    <SessionProvider>
      <TournamentsView />
    </SessionProvider>
  );
}

function TournamentsView() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const [tournaments, setTournaments] = React.useState<TournamentSummary[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  // create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);

  // register dialog
  const [registerFor, setRegisterFor] = React.useState<TournamentSummary | null>(null);
  const [regName, setRegName] = React.useState("");
  const [regPhone, setRegPhone] = React.useState("");
  const [regCustomerId, setRegCustomerId] = React.useState("");
  const [regFeePaid, setRegFeePaid] = React.useState(false);
  const [customers, setCustomers] = React.useState<CustomerLite[] | null>(null);
  const [regSubmitting, setRegSubmitting] = React.useState(false);

  // results dialog
  const [resultsFor, setResultsFor] = React.useState<TournamentSummary | null>(null);
  const [picks, setPicks] = React.useState<Record<number, string>>({});
  const [resultsSubmitting, setResultsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments", { cache: "no-store" });
      const json = await jsonOrThrow<{ tournaments: TournamentSummary[] }>(res);
      setTournaments(json.tournaments);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load tournaments");
      setTournaments([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const stats = React.useMemo(() => {
    const list = tournaments ?? [];
    return {
      upcoming: list.filter((t) => t.status === "UPCOMING").length,
      prizePool: list.filter((t) => t.status !== "CANCELLED").reduce((s, t) => s + (t.prizePool || 0), 0),
      players: list.reduce((s, t) => s + t.entryCount, 0),
      paid: list.reduce((s, t) => s + t.paidCount, 0),
    };
  }, [tournaments]);

  // ----- mutations -----

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.game.trim() || !form.stationType || !form.startsAt) {
      toast.error("Please fill name, game, station type and start time");
      return;
    }
    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          game: form.game,
          stationType: form.stationType,
          startsAt: new Date(form.startsAt).toISOString(),
          entryFee: Number(form.entryFee || 0),
          prizePool: Number(form.prizePool || 0),
          maxPlayers: Number(form.maxPlayers || 16),
          notes: form.notes || undefined,
        }),
      });
      await jsonOrThrow(res);
      toast.success("Tournament created");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create tournament");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function changeStatus(t: TournamentSummary, status: string) {
    if (status === t.status) return;
    setBusy(t.id);
    try {
      const res = await fetch(`/api/tournaments/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await jsonOrThrow(res);
      toast.success(`Status set to ${statusLabel(status)}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setBusy(null);
    }
  }

  async function deleteTournament(t: TournamentSummary) {
    if (!window.confirm(`Delete "${t.name}"? All registrations will be removed. This cannot be undone.`)) return;
    setBusy(t.id);
    try {
      const res = await fetch(`/api/tournaments/${t.id}`, { method: "DELETE" });
      await jsonOrThrow(res);
      toast.success("Tournament deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete tournament");
    } finally {
      setBusy(null);
    }
  }

  function openRegister(t: TournamentSummary) {
    setRegisterFor(t);
    setRegName("");
    setRegPhone("");
    setRegCustomerId("");
    setRegFeePaid(false);
    setCustomers(null);
    fetch("/api/members?q=", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { customers?: CustomerLite[] }) => setCustomers(Array.isArray(j.customers) ? j.customers : []))
      .catch(() => setCustomers([]));
  }

  function pickCustomer(id: string) {
    setRegCustomerId(id);
    const c = customers?.find((x) => x.id === id);
    if (c) {
      setRegName(c.name);
      setRegPhone(c.phone);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registerFor) return;
    setRegSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${registerFor.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          phone: regPhone.trim() || undefined,
          customerId: regCustomerId || undefined,
          feePaid: regFeePaid,
        }),
      });
      await jsonOrThrow(res);
      toast.success(`${regName.trim()} registered`);
      setRegisterFor(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not register player");
    } finally {
      setRegSubmitting(false);
    }
  }

  async function toggleFeePaid(t: TournamentSummary, entry: EntryItem) {
    setBusy(entry.id);
    try {
      const res = await fetch(`/api/tournaments/${t.id}/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, feePaid: !entry.feePaid }),
      });
      await jsonOrThrow(res);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update fee status");
    } finally {
      setBusy(null);
    }
  }

  async function removeEntry(t: TournamentSummary, entry: EntryItem) {
    setBusy(entry.id);
    try {
      const res = await fetch(`/api/tournaments/${t.id}/entries?entryId=${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      });
      await jsonOrThrow(res);
      toast.success(`${entry.name} removed`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove entry");
    } finally {
      setBusy(null);
    }
  }

  function openResults(t: TournamentSummary) {
    setResultsFor(t);
    const preset: Record<number, string> = {};
    for (const e of t.entries) {
      if (e.position === 1 || e.position === 2 || e.position === 3) preset[e.position] = e.id;
    }
    setPicks(preset);
  }

  function pickResult(position: number, entryId: string) {
    setPicks((prev) => {
      const next = { ...prev };
      if (!entryId) {
        delete next[position];
        return next;
      }
      for (const p of [1, 2, 3]) {
        if (p !== position && next[p] === entryId) delete next[p];
      }
      next[position] = entryId;
      return next;
    });
  }

  async function submitResults(e: React.FormEvent) {
    e.preventDefault();
    if (!resultsFor) return;
    const results = [1, 2, 3].flatMap((p) =>
      picks[p] ? [{ entryId: picks[p], position: p }] : []
    );
    if (results.length === 0) {
      toast.error("Pick at least the winner (1st place)");
      return;
    }
    setResultsSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${resultsFor.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      await jsonOrThrow(res);
      toast.success("Results saved — tournament completed");
      setResultsFor(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save results");
    } finally {
      setResultsSubmitting(false);
    }
  }

  // ----- render helpers -----

  function StatusBadge({ status }: { status: string }) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 whitespace-nowrap px-2 py-1 text-[11px] font-semibold",
          STATUS_STYLE[status] ?? "border-white/20 bg-white/5 text-muted-foreground"
        )}
      >
        {status === "ONGOING" && (
          <span className="dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        )}
        {statusLabel(status)}
      </Badge>
    );
  }

  function renderCard(t: TournamentSummary) {
    const typeStyle = TYPE_STYLES[t.stationType as StationType];
    const pct = Math.min(100, Math.round((t.entryCount / Math.max(1, t.maxPlayers)) * 100));
    return (
      <GlassCard
        key={t.id}
        variant={t.status === "UPCOMING" ? "cyan" : "purple"}
        className={cn("p-4 sm:p-5", busy === t.id && "opacity-60")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-wide sm:text-lg">{t.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="gap-1 border-white/15 bg-white/5 text-xs text-foreground/80">
                <Gamepad2 className="h-3 w-3" aria-hidden /> {t.game}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs", typeStyle?.badge ?? "border-white/15 bg-white/5 text-foreground/80")}
              >
                {t.stationType}
              </Badge>
            </div>
          </div>
          <StatusBadge status={t.status} />
        </div>

        <div className="mt-4 grid gap-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
            <span className="tabular">{fmtDateTime(t.startsAt)}</span>
          </p>
          <p className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            <span>Entry fee {t.entryFee > 0 ? formatINR(t.entryFee) : "Free"}</span>
          </p>
          <p className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <span className="font-semibold text-amber-300">Prize pool {formatINR(t.prizePool)}</span>
          </p>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular font-medium text-foreground">
              {t.entryCount}/{t.maxPlayers} players
            </span>
            <span className="tabular">{t.paidCount} fees paid</span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={t.entryCount}
            aria-valuemin={0}
            aria-valuemax={t.maxPlayers}
            aria-label={`Registered players: ${t.entryCount} of ${t.maxPlayers}`}
          >
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {t.notes ? (
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/70">Notes: </span>
            {t.notes}
          </p>
        ) : null}

        {/* Players */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Registered players
          </p>
          {t.entries.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No players yet — use Register to add the first one.</p>
          ) : (
            <ul
              className="scroll-neon mt-2 max-h-96 space-y-2 overflow-y-auto pr-1"
              aria-label={`Players registered in ${t.name}`}
            >
              {t.entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {typeof e.position === "number" && (
                        <Crown
                          className="mr-1 inline h-3.5 w-3.5 text-amber-300"
                          aria-label={`Position ${e.position}`}
                        />
                      )}
                      {e.name}
                    </p>
                    {e.phone ? <p className="tabular text-xs text-muted-foreground">{e.phone}</p> : null}
                  </div>
                  <Button
                    variant="outline"
                    className={cn(
                      "min-h-[44px] shrink-0 px-3 text-xs font-semibold",
                      e.feePaid
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:text-amber-200"
                    )}
                    disabled={busy === e.id}
                    onClick={() => toggleFeePaid(t, e)}
                    aria-label={`${e.feePaid ? "Mark fee unpaid" : "Mark fee paid"} for ${e.name}`}
                  >
                    {busy === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : e.feePaid ? "Fee paid" : "Fee due"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-red-300"
                    disabled={busy === e.id}
                    onClick={() => removeEntry(t, e)}
                    aria-label={`Remove ${e.name} from ${t.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Leaderboard */}
        {t.winners.length > 0 && (
          <div
            className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"
            aria-label={`Leaderboard for ${t.name}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</p>
            <ul className="mt-2 space-y-2">
              {t.winners.map((w) => {
                const place = PLACE_STYLE[w.position];
                const Icon = place?.icon ?? Medal;
                return (
                  <li
                    key={`${w.position}-${w.name}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                      place?.rowClass ?? "border-white/10 bg-white/5"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", place?.iconClass ?? "text-muted-foreground")} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{w.name}</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {PLACE_LABEL[w.position] ?? `#${w.position}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="min-h-[44px] flex-1 sm:flex-none"
            onClick={() => openRegister(t)}
            aria-label={`Register a player in ${t.name}`}
          >
            <UserPlus className="h-4 w-4" /> Register
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px] flex-1 sm:flex-none"
            onClick={() => openResults(t)}
            aria-label={`Set results for ${t.name}`}
          >
            <Trophy className="h-4 w-4" /> Results
          </Button>
          <Select value={t.status} onValueChange={(v) => changeStatus(t, v)}>
            <SelectTrigger
              className="min-h-[44px] w-[150px] flex-1 sm:flex-none"
              aria-label={`Change status of ${t.name}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOURNAMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-muted-foreground hover:text-red-300"
              disabled={busy === t.id}
              onClick={() => deleteTournament(t)}
              aria-label={`Delete tournament ${t.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  // ----- main render -----

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide neon-text sm:text-3xl">Tournaments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Esports events, registration &amp; leaderboards</p>
        </div>
        <Button className="min-h-[44px] px-4" onClick={() => setCreateOpen(true)} aria-label="Create new tournament">
          <Plus className="h-4 w-4" /> New tournament
        </Button>
      </header>

      {tournaments === null ? (
        <>
          <section aria-label="Loading stats" className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </section>
          <section aria-label="Loading tournaments" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </section>
        </>
      ) : (
        <>
          <section aria-label="Tournament stats" className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Upcoming" value={stats.upcoming} icon={CalendarDays} accent="cyan" sub="events scheduled" />
            <StatCard
              title="Total prize pool"
              value={formatINR(stats.prizePool)}
              icon={IndianRupee}
              accent="amber"
              sub="across active events"
            />
            <StatCard
              title="Registered players"
              value={stats.players}
              icon={Users}
              accent="purple"
              sub={`${stats.paid} entry fees paid`}
            />
          </section>

          {tournaments.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 shadow-[0_0_30px_rgba(139,92,246,0.25)]">
                <Trophy className="h-8 w-8 text-violet-300" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">No tournaments yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create your first esports event</p>
              </div>
              <Button className="min-h-[44px] px-5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Create tournament
              </Button>
            </GlassCard>
          ) : (
            <section aria-label="Tournament list" className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tournaments.map(renderCard)}
            </section>
          )}
        </>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="scroll-neon max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Create tournament</DialogTitle>
            <DialogDescription>Set up a new esports event for your zone.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="t-name">Tournament name</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Valorant City Clash"
                required
                minLength={2}
                maxLength={80}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-game">Game</Label>
              <Input
                id="t-game"
                value={form.game}
                onChange={(e) => setForm((f) => ({ ...f, game: e.target.value }))}
                placeholder="e.g. Valorant"
                required
                minLength={2}
                maxLength={40}
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-1.5" aria-label="Quick game picks">
                {GAME_QUICK_PICKS.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant="outline"
                    className="min-h-[44px] px-3 text-xs"
                    onClick={() => setForm((f) => ({ ...f, game: g }))}
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-station">Station type</Label>
              <Select value={form.stationType} onValueChange={(v) => setForm((f) => ({ ...f, stationType: v }))}>
                <SelectTrigger id="t-station" className="min-h-[44px] w-full" aria-label="Station type">
                  <SelectValue placeholder="Pick station type" />
                </SelectTrigger>
                <SelectContent>
                  {STATION_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-starts">Starts at</Label>
              <Input
                id="t-starts"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                required
                className="tabular"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="t-fee">Entry fee (₹)</Label>
                <Input
                  id="t-fee"
                  type="number"
                  min={0}
                  step="1"
                  value={form.entryFee}
                  onChange={(e) => setForm((f) => ({ ...f, entryFee: e.target.value }))}
                  placeholder="0"
                  inputMode="numeric"
                  className="tabular"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-prize">Prize pool (₹)</Label>
                <Input
                  id="t-prize"
                  type="number"
                  min={0}
                  step="1"
                  value={form.prizePool}
                  onChange={(e) => setForm((f) => ({ ...f, prizePool: e.target.value }))}
                  placeholder="0"
                  inputMode="numeric"
                  className="tabular"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-max">Max players</Label>
              <Input
                id="t-max"
                type="number"
                min={2}
                max={256}
                step="1"
                value={form.maxPlayers}
                onChange={(e) => setForm((f) => ({ ...f, maxPlayers: e.target.value }))}
                inputMode="numeric"
                className="tabular"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-notes">Notes (optional)</Label>
              <Textarea
                id="t-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Format, rules, map pool..."
                rows={3}
                maxLength={500}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="min-h-[44px]" disabled={createSubmitting}>
                {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create tournament
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register player dialog */}
      <Dialog
        open={registerFor !== null}
        onOpenChange={(o) => {
          if (!o) setRegisterFor(null);
        }}
      >
        <DialogContent className="scroll-neon max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Register player</DialogTitle>
            <DialogDescription>
              {registerFor
                ? `${registerFor.name} · ${registerFor.entryCount}/${registerFor.maxPlayers} slots filled`
                : "Add a player to this tournament"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRegister} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="reg-customer">Pick existing customer (optional)</Label>
              <Select value={regCustomerId} onValueChange={pickCustomer}>
                <SelectTrigger id="reg-customer" className="min-h-[44px] w-full" aria-label="Pick existing customer">
                  <SelectValue
                    placeholder={
                      customers === null
                        ? "Loading customers..."
                        : customers.length === 0
                          ? "No customers yet"
                          : "Choose a customer"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="scroll-neon max-h-60">
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.phone} · {formatINR(c.walletBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reg-name">Player name</Label>
              <Input
                id="reg-name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Player or team name"
                required
                minLength={2}
                maxLength={60}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reg-phone">Phone (optional)</Label>
              <Input
                id="reg-phone"
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="tabular"
                inputMode="tel"
                autoComplete="off"
              />
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3">
              <span className="text-sm font-medium">Entry fee already paid</span>
              <Switch checked={regFeePaid} onCheckedChange={setRegFeePaid} aria-label="Entry fee already paid" />
            </label>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setRegisterFor(null)}>
                Cancel
              </Button>
              <Button type="submit" className="min-h-[44px]" disabled={regSubmitting}>
                {regSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set results dialog */}
      <Dialog
        open={resultsFor !== null}
        onOpenChange={(o) => {
          if (!o) setResultsFor(null);
        }}
      >
        <DialogContent className="scroll-neon max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Set results</DialogTitle>
            <DialogDescription>
              {resultsFor
                ? `${resultsFor.name} · saving marks it completed`
                : "Pick the top positions for this tournament"}
            </DialogDescription>
          </DialogHeader>
          {resultsFor && resultsFor.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No players registered — register players first.</p>
          ) : (
            <form onSubmit={submitResults} className="grid gap-4">
              {[1, 2, 3].map((p) => (
                <div key={p} className="grid gap-1.5">
                  <Label htmlFor={`res-${p}`}>
                    {p === 1 ? "Winner (1st)" : p === 2 ? "Runner-up (2nd)" : "Semi-finalist (3rd)"}
                  </Label>
                  <Select value={picks[p] ?? ""} onValueChange={(v) => pickResult(p, v)}>
                    <SelectTrigger id={`res-${p}`} className="min-h-[44px] w-full" aria-label={`Select position ${p}`}>
                      <SelectValue
                        placeholder={p === 1 ? "Select winner" : p === 2 ? "Select runner-up" : "Select semi-finalist"}
                      />
                    </SelectTrigger>
                    <SelectContent className="scroll-neon max-h-60">
                      {resultsFor?.entries.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                          {e.phone ? ` · ${e.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setResultsFor(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="min-h-[44px]" disabled={resultsSubmitting}>
                  {resultsSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Save results
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
