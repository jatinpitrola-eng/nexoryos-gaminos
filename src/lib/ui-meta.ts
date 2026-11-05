// Client-safe UI metadata (no server imports — safe for client components)

import type { StationType, RuleKind } from "@/lib/types";

export const TYPE_STYLES: Record<StationType, { badge: string; text: string; border: string; glow: string; label: string }> = {
  PS5: {
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    text: "text-violet-300",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_18px_rgba(139,92,246,0.25)]",
    label: "PlayStation 5",
  },
  XBOX: {
    badge: "bg-lime-500/15 text-lime-300 border-lime-500/40",
    text: "text-lime-300",
    border: "border-lime-500/30",
    glow: "shadow-[0_0_18px_rgba(132,204,22,0.25)]",
    label: "Xbox Series X",
  },
  PC: {
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.25)]",
    label: "Gaming PC",
  },
  VR: {
    badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
    text: "text-fuchsia-300",
    border: "border-fuchsia-500/30",
    glow: "shadow-[0_0_18px_rgba(232,121,249,0.25)]",
    label: "VR Arena",
  },
  SNOOKER: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    text: "text-amber-300",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_18px_rgba(245,158,11,0.25)]",
    label: "Snooker",
  },
  RACING: {
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    text: "text-rose-300",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_18px_rgba(251,113,133,0.25)]",
    label: "Racing Sim",
  },
};

export const RULE_KIND_STYLES: Record<RuleKind, string> = {
  STUDENT: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  HAPPYHOUR: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  OFFPEAK: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  PEAK: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

export const RULE_KIND_LABEL: Record<RuleKind, string> = {
  STUDENT: "Student",
  HAPPYHOUR: "Happy Hour",
  OFFPEAK: "Off-Peak",
  PEAK: "Peak",
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
