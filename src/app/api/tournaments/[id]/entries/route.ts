import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError, notFound } from "@/lib/guards";

export const runtime = "nodejs";

function normalizePhone(raw: string): string | null {
  const p = raw.replace(/[\s\-().]/g, "").trim();
  return p ? p : null;
}

/** POST /api/tournaments/[id]/entries — register a player (both roles). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Invalid request body");

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: { entries: { select: { id: true, name: true, phone: true } } },
    });
    if (!tournament) return notFound("Tournament not found");

    const name = String(body?.name ?? "").trim();
    if (name.length < 2 || name.length > 60) return badRequest("Player name must be 2-60 characters");

    const phoneRaw = body?.phone == null ? "" : String(body.phone);
    const phone = normalizePhone(phoneRaw);
    if (phone && !/^\+?\d{10,13}$/.test(phone))
      return badRequest("Please enter a valid phone number (10-13 digits)");

    const customerId = body?.customerId ? String(body.customerId) : null;
    const feePaid = body?.feePaid === true;

    if (tournament.entries.length >= tournament.maxPlayers) return badRequest("Tournament is full");

    const dup = tournament.entries.some(
      (e) =>
        (phone && e.phone === phone) ||
        e.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (dup) return badRequest("Player already registered");

    const entry = await db.tournamentEntry.create({
      data: { tournamentId: id, name, phone, customerId, feePaid },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

/** PATCH /api/tournaments/[id]/entries — toggle fee paid: { entryId, feePaid }. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Invalid request body");

    const entryId = body?.entryId ? String(body.entryId) : "";
    if (!entryId) return badRequest("entryId is required");
    if (typeof body.feePaid !== "boolean") return badRequest("feePaid must be true or false");

    const entry = await db.tournamentEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.tournamentId !== id) return notFound("Entry not found");

    const updated = await db.tournamentEntry.update({
      where: { id: entryId },
      data: { feePaid: body.feePaid },
    });
    return NextResponse.json({ entry: updated });
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/tournaments/[id]/entries?entryId= — remove a registration (both roles). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const url = new URL(req.url);
    const entryId = (url.searchParams.get("entryId") || "").trim();
    if (!entryId) return badRequest("entryId is required");

    const entry = await db.tournamentEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.tournamentId !== id) return notFound("Entry not found");

    await db.tournamentEntry.delete({ where: { id: entryId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
