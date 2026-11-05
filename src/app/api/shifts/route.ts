import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { computeShiftTotals } from "@/lib/shift-math";

export const runtime = "nodejs";

export async function GET() {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const open = await db.shift.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" } });
    const history = await db.shift.findMany({
      where: { closedAt: { not: null } },
      orderBy: { openedAt: "desc" },
      take: 15,
    });

    const totals = open ? await computeShiftTotals(open.openedAt, new Date()) : null;

    return NextResponse.json({ open, history, totals });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const staffName = String(body?.staffName || "").trim();
    const openingCash = Math.max(0, Number(body?.openingCash) || 0);

    if (!staffName) return badRequest("Staff name is required");

    const open = await db.shift.findFirst({ where: { closedAt: null } });
    if (open) return badRequest("A shift is already open — close it first");

    const shift = await db.shift.create({
      data: { staffName, openedAt: new Date(), openingCash, note: body?.note ? String(body.note) : null },
    });
    return NextResponse.json({ shift }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
