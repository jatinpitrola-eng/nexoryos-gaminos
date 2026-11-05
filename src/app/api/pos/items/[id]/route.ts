import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return badRequest("Name cannot be empty");
      data.name = name;
    }
    if (body?.price !== undefined) {
      const price = Number(body.price);
      if (!(price > 0)) return badRequest("Price must be greater than 0");
      data.price = price;
    }
    if (body?.stock !== undefined) {
      const stock = Math.round(Number(body.stock));
      if (!(stock >= 0)) return badRequest("Stock cannot be negative");
      data.stock = stock;
    }
    if (body?.lowStockAlert !== undefined) {
      const lsa = Math.round(Number(body.lowStockAlert));
      if (!(lsa >= 0)) return badRequest("Low stock alert cannot be negative");
      data.lowStockAlert = lsa;
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const item = await db.fnBItem.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const { id } = await params;
    const item = await db.fnBItem.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return serverError(e);
  }
}
