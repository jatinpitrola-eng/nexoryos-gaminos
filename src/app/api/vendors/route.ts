import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** GET /api/vendors?q= — list vendors with purchase count + total purchased amount. OWNER only. */
export async function GET(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const vendors = await db.vendor.findMany({
      where: q
        ? {
            OR: [{ name: { contains: q } }, { phone: { contains: q } }],
          }
        : {},
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { purchases: true } },
        purchases: { select: { total: true } },
      },
    });

    return NextResponse.json({
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        phone: v.phone,
        gstin: v.gstin,
        notes: v.notes,
        createdAt: v.createdAt,
        purchasesCount: v._count.purchases,
        purchasesTotal: Math.round(v.purchases.reduce((sum, p) => sum + p.total, 0)),
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

/** POST /api/vendors — create a vendor. OWNER only. */
export async function POST(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const phone = body?.phone ? String(body.phone).trim() : null;
    const gstin = body?.gstin ? String(body.gstin).trim().toUpperCase() : null;
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!name) return badRequest("Vendor name is required");

    const vendor = await db.vendor.create({ data: { name, phone, gstin, notes } });
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
