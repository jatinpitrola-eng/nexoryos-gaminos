import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { getZoneSettings, saveZoneSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const [settings, users] = await Promise.all([
      getZoneSettings(),
      db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    ]);
    return NextResponse.json({ settings, users });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const zoneName = body?.zoneName !== undefined ? String(body.zoneName).trim() : undefined;
    const openHour = body?.openHour !== undefined ? Number(body.openHour) : undefined;
    const closeHour = body?.closeHour !== undefined ? Number(body.closeHour) : undefined;

    if (zoneName !== undefined && !zoneName) return badRequest("Zone name cannot be empty");

    await saveZoneSettings({ zoneName, openHour, closeHour });
    const settings = await getZoneSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return serverError(e);
  }
}
