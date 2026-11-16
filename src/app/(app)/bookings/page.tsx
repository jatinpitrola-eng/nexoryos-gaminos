"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatusDot } from "@/components/status-dot";
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
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtDate, fmtTime, hourLabel, isSameDay, minutesOverlap, startOfDay } from "@/lib/hours";
import { formatINR } from "@/lib/money";

const OPEN_HOUR = 10;
const CLOSE_HOUR = 22;
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

interface Booking {
  id: string;
  code: string;
  stationId: string;
  stationName: string;
  stationType: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  slotStart: string;
  slotEnd: string;
  depositAmount: number;
  depositPaid: boolean;
  status: string;
  source: string;
  notify: boolean;
}

interface StationLite {
  id: string;
  name: string;
  type: string;
  status: string;
  hourlyRate: number;
}

interface CustomerLite {
  id: string;
  name: string;
  phone: string;
}

export default function BookingsPage() {
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = React.useState<Booking[] | null>(null);
  const [stations, setStations] = React.useState<StationLite[]>([]);
  const [createFor, setCreateFor] = React.useState<{ station?: StationLite; hour?: number } | null>(null);
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);
  const [zoneName, setZoneName] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings?date=${date}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setBookings(json.bookings);
    } catch {
      toast.error("Could not load bookings");
    }
  }, [date]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  React.useEffect(() => {
    fetch("/api/stations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { stations: [] }))
      .then((j) => setStations(j.stations ?? []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setZoneName(j?.settings?.zoneName ?? ""))
      .catch(() => {});
  }, []);

  const dayStart = React.useMemo(() => startOfDay(new Date(date + "T00:00:00")), [date]);
  const now = new Date();
  const isToday = isSameDay(dayStart, now);

  const upcoming = React.useMemo(
    () =>
      (bookings ?? [])
        .filter((b) => b.status === "BOOKED")
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart)),
    [bookings]
  );

  function shiftDate(days: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  }

  async function bookingAction(b: Booking, action: "CHECKIN" | "NOSHOW" | "CANCEL") {
    if (action === "CANCEL" && !window.confirm(`Cancel booking ${b.code} for ${b.customerName}?`)) return;
    setActionBusy(b.id);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Action failed");
      if (action === "CHECKIN")
        toast.success(`${b.stationName} — session started for ${b.customerName}`);
      else if (action === "NOSHOW") toast.success(`${b.code} marked no-show`);
      else toast.success(`${b.code} cancelled`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionBusy(null);
    }
  }

  function reminderText(b: Booking): string {
    return [
      `Hi ${b.customerName}! 👋 Your slot at our gaming zone is confirmed:`,
      `🎮 ${b.stationName} (${TYPE_STYLES[b.stationType as keyof typeof TYPE_STYLES]?.label ?? b.stationType})`,
      `📅 ${fmtDate(b.slotStart)} · ${fmtTime(b.slotStart)} – ${fmtTime(b.slotEnd)}`,
      `💰 Deposit: ${formatINR(b.depositAmount)} (${b.depositPaid ? "received" : "pending at counter"})`,
      `🔑 Booking code: ${b.code}`,
      `See you soon — reply CALL if you need to change your slot!`,
    ].join("\n");
  }

  function whatsappConfirmText(b: Booking): string {
    return [
      `Hi ${b.customerName}! Your booking at ${zoneName || "our gaming zone"} is confirmed:`,
      `\u{1F3AE} Station: ${b.stationName} (${TYPE_STYLES[b.stationType as keyof typeof TYPE_STYLES]?.label ?? b.stationType})`,
      `\u{1F4C5} ${fmtDate(b.slotStart)} · ${fmtTime(b.slotStart)} – ${fmtTime(b.slotEnd)}`,
      `\u{1F511} Booking code: ${b.code}`,
      `\u{1F4B0} Deposit: ${formatINR(b.depositAmount)} (${b.depositPaid ? "received" : "pay at counter"})`,
      `Show this code at the counter. See you soon!`,
    ].join("\n");
  }

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Copy failed"));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Bookings</h1>
          <p className="text-xs text-muted-foreground">
            Hourly slots, deposits &amp; check-ins. <span className="text-emerald-300">Confirm on WhatsApp</span> opens wa.me pre-filled with the zone
            name, booking code, station &amp; slot — staff just review and hit send.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="border-violet-500/30" onClick={() => shiftDate(-1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40 border-violet-500/25 bg-white/5"
            aria-label="Booking date"
          />
          <Button variant="outline" size="icon" className="border-violet-500/30" onClick={() => shiftDate(1)} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>
            Today
          </Button>
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90" onClick={() => setCreateFor({})}>
            <Plus className="mr-1.5 h-4 w-4" /> New Booking
          </Button>
        </div>
      </header>

      <BookingLinkCard />

      {/* Upcoming today */}
      <section aria-label="Upcoming bookings" className="space-y-3">
        <h2 className="font-display text-base font-semibold tracking-wide">UPCOMING {isToday ? "TODAY" : fmtDate(date).toUpperCase()}</h2>
        {!bookings ? (
          <Skeleton className="h-24 rounded-2xl bg-white/5" />
        ) : upcoming.length === 0 ? (
          <GlassCard className="p-5 text-sm text-muted-foreground">
            No open bookings for this day. Free cells in the calendar below can take walk-in phone bookings.
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {upcoming.map((b) => {
              const start = new Date(b.slotStart);
              const isUpcoming = start.getTime() >= now.getTime();
              return (
                <GlassCard key={b.id} className={"p-4 " + (isUpcoming ? "" : "opacity-60")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold tabular">
                        {fmtTime(b.slotStart)} – {fmtTime(b.slotEnd)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase " + TYPE_STYLES[b.stationType as keyof typeof TYPE_STYLES]?.badge}>
                          {b.stationName}
                        </span>
                        <span className="font-medium">{b.customerName}</span>
                        <span className="text-xs text-muted-foreground">{b.customerPhone}</span>
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {b.source === "ONLINE" ? (
                          <Badge className="border-cyan-400/40 bg-cyan-400/10 text-[10px] text-cyan-300">ONLINE</Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/15 text-[10px]">{b.source}</Badge>
                        )}
                        {b.notify && <Badge className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300">NOTIFY</Badge>}
                        <span>
                          Deposit {formatINR(b.depositAmount)}{" "}
                          {b.depositPaid ? (
                            <span className="font-semibold text-emerald-400">Paid</span>
                          ) : (
                            <span className="font-semibold text-amber-400">Unpaid</span>
                          )}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => copy(b.code, "Booking code")}
                        className="flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-mono text-xs text-violet-200 hover:bg-violet-500/20"
                        aria-label="Copy booking code"
                      >
                        {b.code} <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copy(reminderText(b), "Reminder text")}
                        className="flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                        aria-label="Copy WhatsApp reminder"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Copy reminder
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                    {b.customerPhone && (
                      <a
                        href={`https://wa.me/91${b.customerPhone}?text=${encodeURIComponent(whatsappConfirmText(b))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        aria-label={`Send WhatsApp confirmation to ${b.customerName}`}
                        title="Opens WhatsApp with the zone name, booking code, station & slot pre-filled"
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Confirm on WhatsApp
                      </a>
                    )}
                    <Button size="sm" variant="outline" className="h-9 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                      onClick={() => bookingAction(b, "CHECKIN")} disabled={actionBusy === b.id}>
                      {actionBusy === b.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                      Check-in
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      onClick={() => bookingAction(b, "NOSHOW")} disabled={actionBusy === b.id}>
                      <UserX className="mr-1.5 h-3.5 w-3.5" /> No-show
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 border-red-500/40 text-red-300 hover:bg-red-500/10"
                      onClick={() => bookingAction(b, "CANCEL")} disabled={actionBusy === b.id}>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Day calendar */}
      <section aria-label="Day calendar" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold tracking-wide">DAY CALENDAR</h2>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><StatusDot state="DEPOSIT" pulse={false} /> Deposit paid</span>
            <span className="flex items-center gap-1.5"><StatusDot state="BOOKED" pulse={false} /> Booked</span>
            <span className="flex items-center gap-1.5"><StatusDot state="ACTIVE" pulse={false} /> Checked-in</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground sm:hidden">Scroll sideways to see all hours →</p>
        <div className="overflow-x-auto rounded-2xl border border-violet-500/15 bg-[#0c1122]/60 scroll-neon">
          <div className="min-w-[900px]">
            {/* Hour header */}
            <div className="grid" style={{ gridTemplateColumns: `130px repeat(${HOURS.length}, minmax(76px, 1fr))` }}>
              <div className="border-b border-r border-white/5 p-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Station
              </div>
              {HOURS.map((h) => {
                const cellStart = new Date(dayStart);
                cellStart.setHours(h, 0, 0, 0);
                const isNow = isToday && now.getHours() === h;
                return (
                  <div
                    key={h}
                    className={
                      "border-b border-white/5 p-1.5 text-center text-[10px] font-medium " +
                      (isNow ? "border-t-2 border-t-cyan-400 bg-cyan-500/5 text-cyan-300" : "text-muted-foreground")
                    }
                  >
                    {hourLabel(h)}
                  </div>
                );
              })}
            </div>
            {/* Station rows */}
            {(stations.length ? stations : []).map((st) => {
              const maint = st.status === "MAINTENANCE";
              return (
                <div key={st.id} className="grid" style={{ gridTemplateColumns: `130px repeat(${HOURS.length}, minmax(76px, 1fr))` }}>
                  <div className={"border-b border-r border-white/5 p-2.5 " + (maint ? "opacity-50" : "")}>
                    <p className="truncate text-xs font-semibold">{st.name}</p>
                    <p className="text-[10px] text-muted-foreground">{TYPE_STYLES[st.type as keyof typeof TYPE_STYLES]?.label ?? st.type}</p>
                  </div>
                  {HOURS.map((h) => {
                    const cellStart = new Date(dayStart);
                    cellStart.setHours(h, 0, 0, 0);
                    const cellEnd = new Date(cellStart.getTime() + 3600_000);
                    const covered = (bookings ?? []).filter(
                      (b) =>
                        b.stationId === st.id &&
                        ["BOOKED", "CHECKEDIN"].includes(b.status) &&
                        minutesOverlap(cellStart, cellEnd, new Date(b.slotStart), new Date(b.slotEnd)) > 0
                    );
                    const isPast = isToday && cellEnd.getTime() < now.getTime();
                    const b = covered[0];

                    if (b) {
                      const bg =
                        b.status === "CHECKEDIN"
                          ? "bg-violet-500/25 border-violet-500/50"
                          : b.depositPaid
                            ? "bg-emerald-500/20 border-emerald-500/40"
                            : "bg-amber-500/20 border-amber-500/40";
                      return (
                        <div key={h} className={"m-1 rounded-md border p-1 text-[9px] leading-tight " + bg} title={`${b.code} · ${b.customerName}`}>
                          <p className="truncate font-semibold">{b.customerName.split(" ")[0]}</p>
                          <p className="truncate font-mono opacity-80">{b.code}</p>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={isPast || maint}
                        onClick={() => setCreateFor({ station: st, hour: h })}
                        className={
                          "m-1 rounded-md border p-1 text-[9px] transition-colors " +
                          (isPast || maint
                            ? "border-white/5 bg-white/[0.02] opacity-40"
                            : "border-white/5 bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/10")
                        }
                        aria-label={maint ? `${st.name} under maintenance` : `Book ${st.name} ${hourLabel(h)}`}
                      >
                        {maint ? "🛠" : isPast ? "" : "+"}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CreateBookingDialog
        open={!!createFor}
        stations={stations}
        initialStation={createFor?.station}
        initialHour={createFor?.hour}
        date={date}
        bookings={bookings ?? []}
        onClose={() => setCreateFor(null)}
        onCreated={() => {
          setCreateFor(null);
          load();
        }}
      />
    </div>
  );
}

function CreateBookingDialog({
  open,
  stations,
  initialStation,
  initialHour,
  date,
  bookings,
  onClose,
  onCreated,
}: {
  open: boolean;
  stations: StationLite[];
  initialStation?: StationLite;
  initialHour?: number;
  date: string;
  bookings: Booking[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [stationId, setStationId] = React.useState(initialStation?.id ?? "");
  const [hour, setHour] = React.useState(String(initialHour ?? new Date().getHours() + 1));
  const [duration, setDuration] = React.useState("1");
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<CustomerLite[]>([]);
  const [customer, setCustomer] = React.useState<CustomerLite | null>(null);
  const [deposit, setDeposit] = React.useState("");
  const [depositPaid, setDepositPaid] = React.useState(false);
  const [source, setSource] = React.useState("PHONE");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStationId(initialStation?.id ?? "");
    setHour(String(initialHour ?? Math.min(21, Math.max(OPEN_HOUR, new Date().getHours() + 1))));
    setDuration("1");
    setQ("");
    setResults([]);
    setCustomer(null);
    setDeposit(initialStation ? String(Math.round(initialStation.hourlyRate / 2)) : "");
    setDepositPaid(false);
    setSource("PHONE");
  }, [open, initialStation, initialHour]);

  React.useEffect(() => {
    if (!open) return;
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
  }, [q, open]);

  const startISO = React.useMemo(() => {
    const d = new Date(date + "T00:00:00");
    d.setHours(Number(hour) || OPEN_HOUR, 0, 0, 0);
    return d;
  }, [date, hour]);
  const endISO = new Date(startISO.getTime() + Number(duration) * 3600_000);

  const conflict = React.useMemo(() => {
    if (!stationId) return null;
    return (
      bookings.find(
        (b) =>
          b.stationId === stationId &&
          ["BOOKED", "CHECKEDIN"].includes(b.status) &&
          minutesOverlap(startISO, endISO, new Date(b.slotStart), new Date(b.slotEnd)) > 0
      ) ?? null
    );
  }, [bookings, stationId, startISO, endISO]);

  const canSubmit = stationId && customer && !conflict;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId,
          customerId: customer?.id,
          slotStart: startISO.toISOString(),
          slotEnd: endISO.toISOString(),
          depositAmount: Number(deposit) || 0,
          depositPaid,
          source,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create booking");
      toast.success(`Booking ${json.booking?.code} created`, {
        description: `${json.booking?.station?.name} · ${fmtTime(startISO)} – ${fmtTime(endISO)}`,
      });
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create booking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-violet-500/25 bg-[#0f1526] scroll-neon sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New Booking</DialogTitle>
          <DialogDescription>Hold the slot with a deposit to dodge no-shows.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Station</Label>
            <Select value={stationId} onValueChange={(v) => {
              setStationId(v);
              const st = stations.find((s) => s.id === v);
              if (st) setDeposit(String(Math.round(st.hourlyRate / 2)));
            }}>
              <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue placeholder="Pick a station" /></SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                {stations.filter((s) => s.status !== "MAINTENANCE").map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.type} · ₹{s.hourlyRate}/hr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1.5">
              <Label>Start</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-56 border-violet-500/25 bg-[#0f1526]">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  {["1", "2", "3"].map((d) => (
                    <SelectItem key={d} value={d}>{d} hour{d === "1" ? "" : "s"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label>Date</Label>
              <div className="rounded-md border border-violet-500/25 bg-white/5 px-3 py-2 text-sm">{fmtDate(date + "T00:00:00")}</div>
            </div>
          </div>

          {conflict ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Conflicts with {conflict.code} ({fmtTime(conflict.slotStart)}–{fmtTime(conflict.slotEnd)})
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Slot: {fmtTime(startISO.toISOString())} – {fmtTime(endISO.toISOString())}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Customer</Label>
            {customer ? (
              <div className="flex items-center justify-between rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2">
                <span className="text-sm">{customer.name} · {customer.phone}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCustomer(null)}>Change</Button>
              </div>
            ) : (
              <>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phone or name…" className="border-violet-500/25 bg-white/5" />
                <div className="max-h-40 space-y-1 overflow-y-auto scroll-neon pr-1">
                  {results.map((c) => (
                    <button key={c.id} type="button"
                      onClick={() => setCustomer(c)}
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm hover:border-violet-500/40">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-deposit">Deposit (₹)</Label>
              <Input id="bk-deposit" value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/[^\d.]/g, ""))} placeholder="250" inputMode="decimal" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  {["PHONE", "WALKIN", "ONLINE"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <Label htmlFor="bk-paid" className="text-sm">Deposit received</Label>
            <Switch id="bk-paid" checked={depositPaid} onCheckedChange={setDepositPaid} />
          </div>

          <Button type="submit" disabled={!canSubmit || busy} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
            {busy ? "Booking…" : "Create Booking"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BookingLinkCard() {
  const [url, setUrl] = React.useState("");
  const [qr, setQr] = React.useState("");
  const [showQr, setShowQr] = React.useState(false);

  React.useEffect(() => {
    const u = `${window.location.origin}/book`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 128, margin: 1, color: { dark: "#0a0e1a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => {});
  }, []);

  function copyLink() {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Booking link copied"))
      .catch(() => toast.error("Copy failed"));
  }

  return (
    <GlassCard variant="cyan" className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {qr ? (
            <span className="hidden rounded-lg bg-white p-1.5 sm:block">
              <Image src={qr} alt="Booking page QR code" width={56} height={56} className="h-14 w-14" unoptimized />
            </span>
          ) : (
            <QrCode className="hidden h-8 w-8 text-cyan-300 sm:block" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold tracking-wide">PUBLIC BOOKING LINK</p>
            <p className="truncate text-xs text-muted-foreground">{url || "/book"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10" onClick={copyLink}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
          <a href={url || "/book"} target="_blank" rel="noreferrer" aria-label="Open public booking page">
            <Button size="sm" variant="outline" className="h-9 border-violet-500/40 text-violet-300 hover:bg-violet-500/10">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
            </Button>
          </a>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 sm:hidden"
            onClick={() => setShowQr(!showQr)}
            aria-label={showQr ? "Hide QR code" : "Show QR code"}
            aria-expanded={showQr}
          >
            {showQr ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {showQr && (
        <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-3 sm:hidden">
          {qr && (
            <span className="rounded-lg bg-white p-1.5">
              <Image src={qr} alt="Booking page QR code" width={112} height={112} className="h-28 w-28" unoptimized />
            </span>
          )}
          <p className="text-xs text-muted-foreground">Scan to open the public booking page — customers book without login.</p>
        </div>
      )}
      <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
        Share this link — customers book their own slots and land here with the ONLINE tag + WhatsApp confirm.
      </p>
    </GlassCard>
  );
}
