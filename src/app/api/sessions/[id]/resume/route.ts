import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/**
 * POST /api/sessions/[id]/resume — resume a PAUSED session.
 * Time spent paused is accumulated into pausedMinutes (not billed).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const session = await db.session.findUnique({ where: { id } });
    if (!session) return badRequest("Session not found");
    if (session.status !== "PAUSED") return badRequest("Session is not paused");

    const now = new Date();
    const pausedThisRound = session.pausedAt
      ? Math.max(0, Math.round((now.getTime() - session.pausedAt.getTime()) / 60000))
      : 0;

    const updated = await db.session.update({
      where: { id },
      data: {
        status: "ACTIVE",
        pausedAt: null,
        pausedMinutes: session.pausedMinutes + pausedThisRound,
      },
    });

    return NextResponse.json({
      session: { id: updated.id, status: updated.status, pausedMinutes: updated.pausedMinutes },
      pausedThisRound,
    });
  } catch (e) {
    return serverError(e);
  }
}
