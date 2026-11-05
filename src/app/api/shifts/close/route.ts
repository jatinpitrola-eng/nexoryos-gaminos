import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { computeShiftTotals } from "@/lib/shift-math";

export const runtime = "nodejs";

/** POST /api/shifts/close — { countedCash >= 0, note? } closes the open shift. */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const countedCash = Number(body?.countedCash);
    if (!Number.isFinite(countedCash) || countedCash < 0) return badRequest("Counted cash is required");

    const open = await db.shift.findFirst({ where: { closedAt: null } });
    if (!open) return badRequest("No open shift");

    const now = new Date();
    const totals = await computeShiftTotals(open.openedAt, now);
    const difference = Math.round(countedCash - totals.systemTotal);

    const shift = await db.shift.update({
      where: { id: open.id },
      data: {
        closedAt: now,
        closingCash: countedCash,
        systemTotal: totals.systemTotal,
        note: body?.note ? String(body.note) : open.note,
      },
    });

    return NextResponse.json({ shift, breakdown: totals, difference });
  } catch (e) {
    return serverError(e);
  }
}
