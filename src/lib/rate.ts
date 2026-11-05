// Server-side rate resolution (hits the DB). Use inside API routes only.

import { db } from "@/lib/db";
import { resolveRateFromRules, type ResolvedRate } from "@/lib/pricing";

/** Resolve hourly rate for a station type at a moment, using active PricingRules. */
export async function resolveRate(stationType: string, hourlyRate: number, at: Date = new Date()): Promise<ResolvedRate> {
  const rules = await db.pricingRule.findMany({ where: { stationType, isActive: true } });
  return resolveRateFromRules(rules, stationType, hourlyRate, at);
}
