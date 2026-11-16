import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { STATION_TYPES } from "@/lib/types";

export const runtime = "nodejs";

const LIVE_STATUSES = new Set(["UPCOMING", "ONGOING"]);

/**
 * GET /api/tournaments — list tournaments with counts + winners (both roles).
 * Order: UPCOMING/ONGOING first by startsAt asc, then COMPLETED/CANCELLED by startsAt desc.
 */
export async function GET() {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const rows = await db.tournament.findMany({
      include: {
        entries: {
          select: {
            id: true,
            name: true,
            phone: true,
            customerId: true,
            feePaid: true,
            position: true,
            createdAt: true,
          },
        },
      },
    });

    const tournaments = rows
      .map((t) => {
        const entries = [...t.entries].sort((a, b) => {
          const pa = a.position ?? 99;
          const pb = b.position ?? 99;
          if (pa !== pb) return pa - pb;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        return {
          id: t.id,
          name: t.name,
          game: t.game,
          stationType: t.stationType,
          startsAt: t.startsAt.toISOString(),
          entryFee: t.entryFee,
          prizePool: t.prizePool,
          maxPlayers: t.maxPlayers,
          status: t.status,
          notes: t.notes,
          entryCount: t.entries.length,
          paidCount: t.entries.filter((e) => e.feePaid).length,
          winners: entries
            .filter((e) => typeof e.position === "number")
            .map((e) => ({ position: e.position as number, name: e.name })),
          // Full entry list so the UI can toggle feePaid / remove / pick results.
          entries: entries.map((e) => ({
            id: e.id,
            name: e.name,
            phone: e.phone,
            customerId: e.customerId,
            feePaid: e.feePaid,
            position: e.position,
          })),
        };
      })
      .sort((a, b) => {
        const ra = LIVE_STATUSES.has(a.status) ? 0 : 1;
        const rb = LIVE_STATUSES.has(b.status) ? 0 : 1;
        if (ra !== rb) return ra - rb;
        if (ra === 0) return a.startsAt.localeCompare(b.startsAt);
        return b.startsAt.localeCompare(a.startsAt);
      });

    return NextResponse.json({ tournaments });
  } catch (e) {
    return serverError(e);
  }
}

/** POST /api/tournaments — create a tournament (both roles). */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Invalid request body");

    const name = String(body?.name ?? "").trim();
    const game = String(body?.game ?? "").trim();
    const stationType = String(body?.stationType ?? "").trim();
    const notes = body?.notes == null ? "" : String(body.notes).trim();

    const startsAt = new Date(String(body?.startsAt ?? ""));
    const entryFee = Number(body?.entryFee ?? 0);
    const prizePool = Number(body?.prizePool ?? 0);
    const maxPlayers = Number(body?.maxPlayers ?? 16);

    if (name.length < 2 || name.length > 80) return badRequest("Name must be 2-80 characters");
    if (game.length < 2 || game.length > 40) return badRequest("Game must be 2-40 characters");
    if (!(STATION_TYPES as string[]).includes(stationType)) return badRequest("Invalid station type");
    if (Number.isNaN(startsAt.getTime())) return badRequest("Invalid start date & time");
    if (!Number.isFinite(entryFee) || entryFee < 0) return badRequest("Entry fee must be 0 or more");
    if (!Number.isFinite(prizePool) || prizePool < 0) return badRequest("Prize pool must be 0 or more");
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 256)
      return badRequest("Max players must be between 2 and 256");

    const tournament = await db.tournament.create({
      data: {
        name,
        game,
        stationType,
        startsAt,
        entryFee,
        prizePool,
        maxPlayers,
        notes: notes || null,
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
