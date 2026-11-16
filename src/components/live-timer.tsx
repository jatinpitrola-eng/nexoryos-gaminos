"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function elapsedParts(fromMs: number) {
  const totalSec = Math.max(0, Math.floor(fromMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, totalMin: Math.floor(totalSec / 60) };
}

/** Live elapsed timer, ticks every second. Renders 1:23:45. Pause-aware when pausedMinutes/pausedAt are passed. */
export function LiveTimer({
  startedAt,
  pausedMinutes = 0,
  pausedAt,
  className,
  prefix,
}: {
  startedAt: string | Date;
  pausedMinutes?: number;
  pausedAt?: string | Date | null;
  className?: string;
  prefix?: string;
}) {
  const start = typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt.getTime();
  const paused = pausedAt ? (typeof pausedAt === "string" ? new Date(pausedAt).getTime() : pausedAt.getTime()) : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentPauseMs = paused ? Math.max(0, (now ?? Date.now()) - paused) : 0;
  const elapsedMs = Math.max(0, (now ?? start) - start - pausedMinutes * 60000 - currentPauseMs);
  const { h, m, s } = elapsedParts(elapsedMs);
  const text = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <span
      className={cn("tabular font-display font-semibold", paused ? "text-amber-300" : "text-cyan-300", className)}
      suppressHydrationWarning
    >
      {prefix ? `${prefix} ` : ""}
      {text}
    </span>
  );
}

/** Live cost ticker: rate/60 × billable minutes (pause-aware), rounded to rupee. */
export function LiveCost({
  startedAt,
  rate,
  pausedMinutes = 0,
  pausedAt,
  className,
}: {
  startedAt: string | Date;
  rate: number;
  pausedMinutes?: number;
  pausedAt?: string | Date | null;
  className?: string;
}) {
  const start = typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt.getTime();
  const paused = pausedAt ? (typeof pausedAt === "string" ? new Date(pausedAt).getTime() : pausedAt.getTime()) : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentPauseMs = paused ? Math.max(0, (now ?? Date.now()) - paused) : 0;
  const elapsedMs = Math.max(0, (now ?? start) - start - pausedMinutes * 60000 - currentPauseMs);
  const { totalMin } = elapsedParts(elapsedMs);
  const cost = Math.round((rate * Math.max(1, totalMin)) / 60);

  return (
    <span className={cn("tabular font-display font-semibold text-emerald-300", className)} suppressHydrationWarning>
      ₹{cost.toLocaleString("en-IN")}
    </span>
  );
}
