import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import type { FloorStation } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const stations = await db.station.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          include: { customer: { select: { name: true, phone: true } } },
          take: 1,
        },
      },
    });

    const payload: FloorStation[] = stations.map((s) => {
      const active = s.sessions[0];
      return {
        id: s.id,
        name: s.name,
        type: s.type as FloorStation["type"],
        status: s.status as FloorStation["status"],
        hourlyRate: s.hourlyRate,
        activeSession: active
          ? {
              id: active.id,
              startedAt: active.startedAt.toISOString(),
              rateSnapshot: active.rateSnapshot,
              customerName: active.customer?.name ?? null,
              customerPhone: active.customer?.phone ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({ stations: payload });
  } catch (e) {
    return serverError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => null);
    const stationId = String(body?.stationId || "");
    const action = String(body?.action || "");
    const issue = body?.issue ? String(body.issue) : undefined;

    if (!stationId || action !== "TOGGLE_MAINTENANCE") return badRequest("Invalid request");

    const station = await db.station.findUnique({
      where: { id: stationId },
      include: { sessions: { where: { status: "ACTIVE" } } },
    });
    if (!station) return badRequest("Station not found");
    if (station.sessions.length > 0) return badRequest("End the active session before maintenance");

    if (station.status === "MAINTENANCE") {
      const [updated] = await Promise.all([
        db.station.update({ where: { id: stationId }, data: { status: "FREE" } }),
        db.maintenanceLog.updateMany({
          where: { stationId, resolvedAt: null },
          data: { resolvedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ station: updated });
    }

    const [updated] = await Promise.all([
      db.station.update({ where: { id: stationId }, data: { status: "MAINTENANCE" } }),
      db.maintenanceLog.create({
        data: { stationId, issue: issue?.trim() || "Marked under maintenance" },
      }),
    ]);
    return NextResponse.json({ station: updated });
  } catch (e) {
    return serverError(e);
  }
}
