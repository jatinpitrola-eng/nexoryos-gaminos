import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (body?.name !== undefined) data.name = String(body.name).trim();
    if (body?.stationType !== undefined) data.stationType = String(body.stationType);
    if (body?.kind !== undefined) data.kind = String(body.kind);
    if (body?.ratePerHour !== undefined) {
      const rate = Number(body.ratePerHour);
      if (!(rate > 0)) return badRequest("Rate per hour must be greater than 0");
      data.ratePerHour = rate;
    }
    if (body?.daysMask !== undefined) {
      const mask = Number(body.daysMask);
      if (!(Number.isInteger(mask) && mask >= 1 && mask <= 127)) return badRequest("Days mask must be 1-127");
      data.daysMask = mask;
    }
    if (body?.startHour !== undefined) {
      const h = Number(body.startHour);
      if (!(Number.isInteger(h) && h >= 0 && h <= 23)) return badRequest("Start hour must be 0-23");
      data.startHour = h;
    }
    if (body?.endHour !== undefined) {
      const h = Number(body.endHour);
      if (!(Number.isInteger(h) && h >= 1 && h <= 24)) return badRequest("End hour must be 1-24");
      data.endHour = h;
    }
    if (data.startHour !== undefined || data.endHour !== undefined) {
      const existing = await db.pricingRule.findUnique({ where: { id } });
      if (!existing) return badRequest("Rule not found");
      const startHour = (data.startHour as number) ?? existing.startHour;
      const endHour = (data.endHour as number) ?? existing.endHour;
      if (endHour <= startHour) return badRequest("End hour must be after start hour");
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const rule = await db.pricingRule.update({ where: { id }, data });
    return NextResponse.json({ rule });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const { id } = await params;
    await db.pricingRule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
