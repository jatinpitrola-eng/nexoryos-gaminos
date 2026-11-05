import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ACCENTS = {
  purple: "from-violet-500/20 to-transparent text-violet-300",
  cyan: "from-cyan-500/20 to-transparent text-cyan-300",
  green: "from-emerald-500/20 to-transparent text-emerald-300",
  amber: "from-amber-500/20 to-transparent text-amber-300",
  red: "from-red-500/20 to-transparent text-red-300",
} as const;

export function StatCard({
  title,
  value,
  icon: Icon,
  accent = "purple",
  sub,
  className,
}: {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass glass-neon relative overflow-hidden rounded-2xl p-4 sm:p-5", className)}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-60", ACCENTS[accent])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1.5 font-display text-xl font-bold tabular sm:text-2xl">{value}</p>
          {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        <div className={cn("rounded-xl border border-white/10 bg-white/5 p-2.5", ACCENTS[accent].split(" ").pop())}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
