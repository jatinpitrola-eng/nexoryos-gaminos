import Image from "next/image";
import { cn } from "@/lib/utils";

/** GAMINOS wordmark with neon gradient. */
export function Brand({
  size = "md",
  withByline = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withByline?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl sm:text-4xl",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white sm:h-9 sm:w-9">
        <Image src="/nexoryos.png" alt="Nexoryos logo" width={36} height={36} className="h-full w-full object-contain p-0.5" />
      </span>
      <span className="leading-none">
        <span className={cn("font-display font-extrabold tracking-widest neon-text", sizes[size])}>GAMINOS</span>
        {withByline ? (
          <span className="ml-1.5 hidden align-middle text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:inline">
            by Nexoryos
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Small footer badge used on every page. */
export function NexoryosBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium tracking-wide text-violet-300",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 dot-glow" aria-hidden />
      A Nexoryos Product
    </span>
  );
}
