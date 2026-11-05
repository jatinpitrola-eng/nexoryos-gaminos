import { cn } from "@/lib/utils";

export type DotState =
  | "FREE"
  | "BUSY"
  | "MAINTENANCE"
  | "BOOKED"
  | "DEPOSIT"
  | "ACTIVE"
  | "OFF";

const COLORS: Record<DotState, string> = {
  FREE: "text-emerald-500",
  BUSY: "text-amber-500",
  MAINTENANCE: "text-red-500",
  BOOKED: "text-amber-500",
  DEPOSIT: "text-emerald-500",
  ACTIVE: "text-violet-400",
  OFF: "text-slate-500",
};

/** Glowing status dot (color via currentColor glow). */
export function StatusDot({
  state,
  pulse = true,
  className,
}: {
  state: DotState;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={state}
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full dot-glow",
        pulse && "dot-pulse",
        COLORS[state],
        className
      )}
    />
  );
}
