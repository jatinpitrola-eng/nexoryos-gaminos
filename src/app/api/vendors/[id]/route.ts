import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, notFound, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** PATCH /api/vendors/[id] — update vendor details. OWNER only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const { id } = await params;

    const existing = await db.vendor.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return notFound("Vendor not found");

    const body = await req.json().catch(() => ({}));

    const data: { name?: string; phone?: string | null; gstin?: string | null; notes?: string | null } = {};
    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return badRequest("Vendor name cannot be empty");
      data.name = name;
    }
    if (body?.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body?.gstin !== undefined) data.gstin = body.gstin ? String(body.gstin).trim().toUpperCase() : null;
    if (body?.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;

    const vendor = await db.vendor.update({ where: { id }, data });
    return NextResponse.json({ vendor });
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/vendors/[id] — only allowed when the vendor has no purchases. OWNER only. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const { id } = await params;

    const vendor = await db.vendor.findUnique({
      where: { id },
      select: { id: true, _count: { select: { purchases: true } } },
    });
    if (!vendor) return notFound("Vendor not found");
    if (vendor._count.purchases > 0) return badRequest("Vendor has purchases — delete purchases first");

    await db.vendor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
