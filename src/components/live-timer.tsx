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

/** Live elapsed timer, ticks every second. Renders 1:23:45 */
export function LiveTimer({
  startedAt,
  className,
  prefix,
}: {
  startedAt: string | Date;
  className?: string;
  prefix?: string;
}) {
  const start = typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt.getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { h, m, s } = elapsedParts((now ?? start) - start);
  const text = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <span className={cn("tabular font-display font-semibold text-cyan-300", className)} suppressHydrationWarning>
      {prefix ? `${prefix} ` : ""}
      {text}
    </span>
  );
}

/** Live cost ticker: rate/60 × elapsed minutes, rounded to rupee. */
export function LiveCost({ startedAt, rate, className }: { startedAt: string | Date; rate: number; className?: string }) {
  const start = typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt.getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { totalMin } = elapsedParts((now ?? start) - start);
  const cost = Math.round((rate * Math.max(1, totalMin)) / 60);

  return (
    <span className={cn("tabular font-display font-semibold text-emerald-300", className)} suppressHydrationWarning>
      ₹{cost.toLocaleString("en-IN")}
    </span>
  );
}
