// Pure pricing-rule matching engine. Safe for client + server.
// Priority when multiple rules match: STUDENT > HAPPYHOUR > OFFPEAK > PEAK > base rate.

import type { RuleKind } from "@/lib/types";

export const RULE_PRIORITY: Record<RuleKind, number> = {
  STUDENT: 4,
  HAPPYHOUR: 3,
  OFFPEAK: 2,
  PEAK: 1,
};

export interface RuleLike {
  name?: string;
  stationType: string;
  kind: string;
  ratePerHour: number;
  daysMask: number; // bit 0 = Sunday ... bit 6 = Saturday
  startHour: number; // inclusive
  endHour: number; // exclusive
  isActive: boolean;
}

/** Bitmask for a date's weekday (0 = Sunday). */
export function daysMaskFor(date: Date): number {
  return 1 << date.getDay();
}

export function maskMatches(mask: number, date: Date): boolean {
  return (mask & daysMaskFor(date)) !== 0;
}

export function hourMatches(rule: RuleLike, date: Date): boolean {
  const h = date.getHours();
  return h >= rule.startHour && h < rule.endHour;
}

export interface ResolvedRate {
  rate: number;
  kind: RuleKind | null; // null = base station rate
  ruleName: string | null;
}

/**
 * Resolve the applicable rate for a station type at a datetime.
 * Pure function — pass all active rules for that station type.
 */
export function resolveRateFromRules(
  rules: RuleLike[],
  stationType: string,
  hourlyRate: number,
  at: Date
): ResolvedRate {
  const matching = rules.filter(
    (r) => r.isActive && r.stationType === stationType && maskMatches(r.daysMask, at) && hourMatches(r, at)
  );
  if (matching.length === 0) return { rate: hourlyRate, kind: null, ruleName: null };
  matching.sort((a, b) => {
    const pa = RULE_PRIORITY[(a.kind as RuleKind) ?? "PEAK"] ?? 0;
    const pb = RULE_PRIORITY[(b.kind as RuleKind) ?? "PEAK"] ?? 0;
    if (pb !== pa) return pb - pa; // higher priority first
    return b.ratePerHour - a.ratePerHour;
  });
  const winner = matching[0];
  return { rate: winner.ratePerHour, kind: winner.kind as RuleKind, ruleName: winner.name ?? null };
}
