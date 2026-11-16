"use client";

import * as React from "react";
import Image from "next/image";
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  MonitorPlay,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtDate, fmtTime, hourLabel } from "@/lib/hours";
import { cn } from "@/lib/utils";

interface TypeAvailability {
  type: string;
  total: number;
  hours: { hour: number; available: number }[];
}

interface StationStatus {
  id: string;
  name: string;
  type: string;
  status: "FREE" | "BUSY" | "MAINTENANCE" | "BOOKED";
  busyUntil: string | null;
  nextFreeHour: number | null;
}

interface Availability {
  zoneName: string;
  openHour: number;
  closeHour: number;
  date: string;
  now: string;
  types: TypeAvailability[];
  stations: StationStatus[];
}

interface BookedSlot {
  code: string;
  stationName: string;
  stationType: string;
  slotStart: string;
  slotEnd: string;
  notify: boolean;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hourShort(h: number): string {
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
}

export default function PublicBookingPage() {
  const [avail, setAvail] = React.useState<Availability | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [dateIdx, setDateIdx] = React.useState(0);
  const [stationType, setStationType] = React.useState("");
  const [startHour, setStartHour] = React.useState("");
  const [hours, setHours] = React.useState("2");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState<BookedSlot | null>(null);

  const dates = React.useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          ymd: toYMD(d),
          label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        };
      }),
    []
  );
  const date = dates[dateIdx].ymd;

  const load = React.useCallback(async () => {
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/public/availability?date=${date}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setAvail(await res.json());
    } catch {
      setLoadFailed(true);
      toast.error("Could not load live availability — tap retry");
    }
  }, [date]);

  React.useEffect(() => {
    load();
  }, [load]);

  const selectedTypeData = React.useMemo(() => avail?.types.find((t) => t.type === stationType) ?? null, [avail, stationType]);
  const availableHours = React.useMemo(
    () => (selectedTypeData?.hours ?? []).filter((h) => h.available > 0).map((h) => h.hour),
    [selectedTypeData]
  );
  const ahKey = availableHours.join(",");

  React.useEffect(() => {
    setStartHour((cur) => {
      const list = ahKey ? ahKey.split(",").map(Number) : [];
      return list.includes(Number(cur)) ? cur : list.length ? String(list[0]) : "";
    });
  }, [ahKey]);

  React.useEffect(() => {
    if (!stationType && avail?.types.length) setStationType(avail.types[0].type);
  }, [avail, stationType]);

  const closeHour = avail?.closeHour ?? 22;
  const durationOptions = React.useMemo(
    () => [1, 2, 3, 4, 5, 6].filter((d) => !startHour || Number(startHour) + d <= closeHour),
    [startHour, closeHour]
  );
  const safeHours = durationOptions.includes(Number(hours)) ? hours : String(durationOptions[durationOptions.length - 1] ?? 1);

  function pickFromChip(type: string, hour: number) {
    if (type !== stationType) {
      setStationType(type);
      load();
    }
    setStartHour(String(hour));
    document.getElementById("book-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          stationType,
          date,
          startHour: Number(startHour),
          hours: Number(safeHours),
          notify,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not complete the booking");
      setSuccess(json.booking);
      toast.success(`Booking ${json.booking.code} confirmed`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the booking");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setStartHour("");
    setHours("2");
    setNotify(true);
    load();
  }

  const zoneName = avail?.zoneName ?? "Nexoryos Gaming Zone";

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 sm:px-6">
        <main className="flex-1 space-y-6 py-6 sm:py-10">
          <header className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                <Image src="/nexoryos.png" alt="Nexoryos logo" width={40} height={40} className="h-full w-full object-contain p-0.5" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-widest neon-text">NEXORYOS</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-black tracking-wide sm:text-4xl">{zoneName}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              Advance Booking — book your PC before you arrive
            </p>
            <Badge variant="outline" className="mt-3 border-violet-500/30 bg-violet-500/10 text-[10px] text-violet-300">
              Powered by NexoryOS GameZone OS
            </Badge>
          </header>

          <section aria-label="Pick a date">
            <div className="flex gap-2 overflow-x-auto pb-1 scroll-neon">
              {dates.map((d, i) => (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => setDateIdx(i)}
                  aria-pressed={dateIdx === i}
                  className={cn(
                    "min-h-11 shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                    dateIdx === i
                      ? "border-violet-500/70 bg-violet-500/15 text-violet-200 shadow-[0_0_14px_rgba(139,92,246,0.35)]"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-violet-500/40 hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Live availability" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-wide">
                <Wifi className="h-4 w-4 text-emerald-400 dot-pulse" /> LIVE AVAILABILITY
              </h2>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-400">Green = free</span> · <span className="font-semibold text-red-400">Red = full</span>
              </p>
            </div>

            {loadFailed ? (
              <GlassCard className="p-5 text-center">
                <p className="text-sm text-muted-foreground">Live availability is not loading right now.</p>
                <Button variant="outline" className="mt-3 border-violet-500/40 text-violet-300" onClick={load}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </GlassCard>
            ) : !avail ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-32 rounded-2xl bg-white/5" />
                <Skeleton className="h-32 rounded-2xl bg-white/5" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {avail.types.map((t) => {
                  const meta = TYPE_STYLES[t.type as keyof typeof TYPE_STYLES];
                  return (
                    <GlassCard key={t.type} variant="cyan" className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-display text-sm font-bold">{meta?.label ?? t.type}</p>
                          <p className="text-xs text-muted-foreground">{t.total} station{t.total === 1 ? "" : "s"}</p>
                        </div>
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", meta?.badge ?? "border-white/20 bg-white/5")}>
                          {t.type}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scroll-neon">
                        {t.hours.map((hh) => {
                          const open = hh.available > 0;
                          return (
                            <button
                              key={hh.hour}
                              type="button"
                              disabled={!open}
                              onClick={() => pickFromChip(t.type, hh.hour)}
                              aria-label={`${meta?.label ?? t.type} at ${hourLabel(hh.hour)} — ${open ? `${hh.available} of ${t.total} free` : "full"}`}
                              className={cn(
                                "h-12 min-w-[48px] shrink-0 rounded-lg border px-1.5 text-center transition-colors",
                                open
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                  : "cursor-not-allowed border-red-500/25 bg-red-500/[0.06] text-red-400/60 line-through"
                              )}
                            >
                              <span className="block text-[10px] leading-none opacity-80">{hourShort(hh.hour)}</span>
                              <span className="mt-0.5 block text-[11px] font-bold leading-none">
                                {open ? `${hh.available}/${t.total}` : "FULL"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </section>

          {avail && avail.stations.length > 0 && (
            <section aria-label="Station status" className="space-y-3">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-wide">
                <MonitorPlay className="h-4 w-4 text-cyan-400" /> STATIONS NOW
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {avail.stations.map((st) => {
                  const meta = TYPE_STYLES[st.type as keyof typeof TYPE_STYLES];
                  const dot =
                    st.status === "FREE" ? "FREE" : st.status === "BUSY" ? "BUSY" : st.status === "MAINTENANCE" ? "MAINTENANCE" : "BOOKED";
                  const sub =
                    st.status === "FREE"
                      ? "Open now"
                      : st.status === "BUSY"
                        ? st.busyUntil
                          ? `till ${fmtTime(st.busyUntil)}`
                          : "In session"
                        : st.status === "BOOKED"
                          ? st.busyUntil
                            ? `booked till ${fmtTime(st.busyUntil)}`
                            : "reserved"
                          : "Maintenance";
                  return (
                    <div key={st.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <StatusDot state={dot} pulse={st.status !== "MAINTENANCE"} className={st.status === "BOOKED" ? "text-cyan-400" : undefined} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{st.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {meta?.label ?? st.type} · {sub}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section aria-label="Booking form">
            {success ? (
              <GlassCard variant="cyan" className="p-6 text-center sm:p-8">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <p className="mt-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">Booking confirmed</p>
                <p className="mt-2 font-display text-4xl font-black tracking-widest text-cyan-300 neon-text tabular sm:text-5xl">{success.code}</p>
                <p className="mt-4 text-sm font-medium">
                  {success.stationName} · {TYPE_STYLES[success.stationType as keyof typeof TYPE_STYLES]?.label ?? success.stationType}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {fmtDate(success.slotStart)} · {fmtTime(success.slotStart)} – {fmtTime(success.slotEnd)}
                </p>
                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-200">
                  Show this code at the counter
                </p>
                {success.notify && (
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-300">
                    <MessageCircle className="h-3.5 w-3.5" /> We will WhatsApp you shortly to confirm your slot
                  </p>
                )}
                <Button
                  variant="outline"
                  className="mt-5 min-h-11 border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                  onClick={resetForm}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" /> Book another slot
                </Button>
              </GlassCard>
            ) : (
              <GlassCard className="p-5 sm:p-6">
                <h2 className="font-display text-lg font-bold tracking-wide">BOOK YOUR SLOT</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reserve now, pay at the counter — no advance needed.
                </p>
                <form id="book-form" onSubmit={submit} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-name">Your name</Label>
                    <Input
                      id="bk-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Patel"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={60}
                      className="min-h-11 border-violet-500/25 bg-white/5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-phone">WhatsApp mobile number</Label>
                    <Input
                      id="bk-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      autoComplete="tel"
                      required
                      className="min-h-11 border-violet-500/25 bg-white/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bk-type">Station type</Label>
                      <Select
                        value={stationType}
                        onValueChange={(v) => {
                          setStationType(v);
                          load();
                        }}
                      >
                        <SelectTrigger id="bk-type" className="min-h-11 border-violet-500/25 bg-white/5" aria-label="Station type">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                          {(avail?.types ?? []).map((t) => (
                            <SelectItem key={t.type} value={t.type}>
                              {TYPE_STYLES[t.type as keyof typeof TYPE_STYLES]?.label ?? t.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bk-hour">Start time</Label>
                      <Select value={startHour} onValueChange={setStartHour} disabled={!availableHours.length}>
                        <SelectTrigger id="bk-hour" className="min-h-11 border-violet-500/25 bg-white/5" aria-label="Start time">
                          <SelectValue placeholder={availableHours.length ? "Pick a time" : "No free slot"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-56 border-violet-500/25 bg-[#0f1526] scroll-neon">
                          {availableHours.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {hourLabel(h)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5 sm:col-span-1">
                      <Label htmlFor="bk-hours">Duration</Label>
                      <Select value={safeHours} onValueChange={setHours}>
                        <SelectTrigger id="bk-hours" className="min-h-11 border-violet-500/25 bg-white/5" aria-label="Duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                          {durationOptions.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} hour{d === 1 ? "" : "s"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                    <Checkbox
                      id="bk-notify"
                      checked={notify}
                      onCheckedChange={(v) => setNotify(v === true)}
                      className="mt-0.5 border-violet-500/40 data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600"
                    />
                    <div>
                      <Label htmlFor="bk-notify" className="text-sm leading-snug">
                        Notify me on WhatsApp for confirmation
                      </Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">WhatsApp par confirm karva mate notify karo</p>
                    </div>
                  </div>

                  {stationType && availableHours.length === 0 && (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      No free {TYPE_STYLES[stationType as keyof typeof TYPE_STYLES]?.label ?? stationType} slots on this date — try another type or day.
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={busy || !name.trim() || !phone.trim() || !stationType || !startHour}
                    className="h-12 w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-bold text-white hover:opacity-90"
                  >
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {busy ? "Booking…" : "Book Now — Free"}
                  </Button>
                </form>
              </GlassCard>
            )}
          </section>
        </main>

        <footer className="mt-auto border-t border-white/5 py-5 text-center">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">A Nexoryos Product</span>
        </footer>
      </div>
    </div>
  );
}
