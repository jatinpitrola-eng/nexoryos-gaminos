import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError, notFound } from "@/lib/guards";

export const runtime = "nodejs";

/**
 * POST /api/tournaments/[id]/results — set final positions (both roles).
 * Body: { results: [{ entryId, position }] } — position 1 winner, 2 runner-up, 3 semi-finalist.
 * Marks the tournament COMPLETED.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const results = Array.isArray(body?.results) ? body.results : null;
    if (!results || results.length === 0) return badRequest("results must be a non-empty array");

    const positions = new Set<number>();
    const parsed: { entryId: string; position: number }[] = [];
    for (const r of results) {
      const entryId = r?.entryId ? String(r.entryId) : "";
      const position = Number(r?.position);
      if (!entryId) return badRequest("Each result needs an entryId");
      if (!Number.isInteger(position) || position < 1 || position > 3)
        return badRequest("Positions must be 1 (winner), 2 (runner-up) or 3 (semi-finalist)");
      if (positions.has(position)) return badRequest("Each position can only be assigned once");
      positions.add(position);
      parsed.push({ entryId, position });
    }

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: { entries: { select: { id: true } } },
    });
    if (!tournament) return notFound("Tournament not found");

    const entryIds = new Set(tournament.entries.map((e) => e.id));
    for (const p of parsed) {
      if (!entryIds.has(p.entryId))
        return badRequest("One of the entries does not belong to this tournament");
    }

    await db.$transaction([
      ...parsed.map((p) =>
        db.tournamentEntry.update({ where: { id: p.entryId }, data: { position: p.position } })
      ),
      db.tournament.update({ where: { id }, data: { status: "COMPLETED" } }),
    ]);

    const updated = await db.tournament.findUnique({
      where: { id },
      include: { entries: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ ok: true, tournament: updated });
  } catch (e) {
    return serverError(e);
  }
}
