import { cn } from "@/lib/utils";
import * as React from "react";

/** Glassmorphism card with 1px neon border + soft glow. */
export function GlassCard({
  className,
  variant = "purple",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "purple" | "cyan" | "plain" }) {
  return (
    <div
      className={cn(
        "rounded-2xl glass",
        variant === "purple" && "glass-neon",
        variant === "cyan" && "glass-neon-cyan",
        className
      )}
      {...props}
    />
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("font-display text-lg font-semibold tracking-wide text-foreground", className)}>{children}</h2>;
}
