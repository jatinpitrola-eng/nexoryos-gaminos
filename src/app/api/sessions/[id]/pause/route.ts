import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/**
 * POST /api/sessions/[id]/pause — pause an ACTIVE session.
 * The seat stays occupied; billable minutes freeze until resume.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;

    const session = await db.session.findUnique({ where: { id } });
    if (!session) return badRequest("Session not found");
    if (session.status !== "ACTIVE") return badRequest("Only a running session can be paused");

    const updated = await db.session.update({
      where: { id },
      data: { status: "PAUSED", pausedAt: new Date() },
    });

    return NextResponse.json({ session: { id: updated.id, status: updated.status, pausedAt: updated.pausedAt } });
  } catch (e) {
    return serverError(e);
  }
}
