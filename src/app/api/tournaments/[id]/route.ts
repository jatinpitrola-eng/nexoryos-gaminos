import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError, notFound } from "@/lib/guards";
import { STATION_TYPES, TOURNAMENT_STATUSES } from "@/lib/types";

export const runtime = "nodejs";

/** PATCH /api/tournaments/[id] — edit fields / change status (both roles). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Invalid request body");

    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const status = String(body.status);
      if (!(TOURNAMENT_STATUSES as string[]).includes(status))
        return badRequest("Invalid status — use UPCOMING, ONGOING, COMPLETED or CANCELLED");
      data.status = status;
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 80) return badRequest("Name must be 2-80 characters");
      data.name = name;
    }
    if (body.game !== undefined) {
      const game = String(body.game).trim();
      if (game.length < 2 || game.length > 40) return badRequest("Game must be 2-40 characters");
      data.game = game;
    }
    if (body.stationType !== undefined) {
      const stationType = String(body.stationType);
      if (!(STATION_TYPES as string[]).includes(stationType)) return badRequest("Invalid station type");
      data.stationType = stationType;
    }
    if (body.startsAt !== undefined) {
      const startsAt = new Date(String(body.startsAt));
      if (Number.isNaN(startsAt.getTime())) return badRequest("Invalid start date & time");
      data.startsAt = startsAt;
    }
    if (body.entryFee !== undefined) {
      const entryFee = Number(body.entryFee);
      if (!Number.isFinite(entryFee) || entryFee < 0) return badRequest("Entry fee must be 0 or more");
      data.entryFee = entryFee;
    }
    if (body.prizePool !== undefined) {
      const prizePool = Number(body.prizePool);
      if (!Number.isFinite(prizePool) || prizePool < 0) return badRequest("Prize pool must be 0 or more");
      data.prizePool = prizePool;
    }
    if (body.maxPlayers !== undefined) {
      const maxPlayers = Number(body.maxPlayers);
      if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 256)
        return badRequest("Max players must be between 2 and 256");
      data.maxPlayers = maxPlayers;
    }
    if (body.notes !== undefined) {
      const notes = body.notes == null ? "" : String(body.notes).trim();
      data.notes = notes || null;
    }

    if (Object.keys(data).length === 0) return badRequest("Nothing to update");

    const existing = await db.tournament.findUnique({ where: { id } });
    if (!existing) return notFound("Tournament not found");

    const tournament = await db.tournament.update({ where: { id }, data });
    return NextResponse.json({ tournament });
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/tournaments/[id] — owner only. Entries cascade. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    if (g.role !== "OWNER") return badRequest("Owner access required");

    const existing = await db.tournament.findUnique({ where: { id } });
    if (!existing) return notFound("Tournament not found");

    await db.tournament.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
