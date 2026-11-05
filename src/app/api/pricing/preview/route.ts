import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { resolveRateFromRules } from "@/lib/pricing";
import { STATION_TYPES } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/pricing/preview?stationType=PC&datetime=ISO — which rule wins & computed rate. */
export async function GET(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const stationType = url.searchParams.get("stationType") || "PC";
    if (!STATION_TYPES.includes(stationType as never)) return badRequest("Invalid station type");

    const dtParam = url.searchParams.get("datetime");
    const at = dtParam && !isNaN(new Date(dtParam).getTime()) ? new Date(dtParam) : new Date();

    const baseParam = url.searchParams.get("baseRate");
    let baseRate = baseParam ? Number(baseParam) : NaN;
    if (!Number.isFinite(baseRate) || baseRate <= 0) {
      const st = await db.station.findFirst({
        where: { type: stationType, isActive: true },
        orderBy: { hourlyRate: "asc" },
      });
      baseRate = st?.hourlyRate ?? 100;
    }

    const rules = await db.pricingRule.findMany({ where: { stationType, isActive: true } });
    const { rate, kind, ruleName } = resolveRateFromRules(rules, stationType, baseRate, at);

    // All matching rules, sorted by priority desc (for transparency)
    const matches = rules
      .filter((r) => {
        const h = at.getHours();
        return (r.daysMask & (1 << at.getDay())) !== 0 && h >= r.startHour && h < r.endHour;
      })
      .sort((a, b) => {
        const P = { STUDENT: 4, HAPPYHOUR: 3, OFFPEAK: 2, PEAK: 1 } as Record<string, number>;
        return (P[b.kind] ?? 0) - (P[a.kind] ?? 0);
      })
      .map((r) => ({ name: r.name, kind: r.kind, ratePerHour: r.ratePerHour }));

    return NextResponse.json({ rate, kind, ruleName, baseRate, at: at.toISOString(), stationType, matches });
  } catch (e) {
    return serverError(e);
  }
}
