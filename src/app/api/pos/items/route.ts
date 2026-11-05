import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { FN_B_CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;
    const items = await db.fnBItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
    return NextResponse.json({ items });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const category = String(body?.category || "");
    const price = Number(body?.price) || 0;
    const stock = Math.max(0, Math.round(Number(body?.stock) || 0));
    const lowStockAlert = Math.max(0, Math.round(Number(body?.lowStockAlert ?? 5)));

    if (!name) return badRequest("Item name is required");
    if (!FN_B_CATEGORIES.includes(category as never)) return badRequest("Invalid category");
    if (!(price > 0)) return badRequest("Price must be greater than 0");

    const existing = await db.fnBItem.findUnique({ where: { name } });
    if (existing) return badRequest("An item with this name already exists");

    const item = await db.fnBItem.create({ data: { name, category, price, stock, lowStockAlert } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
