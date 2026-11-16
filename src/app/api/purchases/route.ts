import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

const METHODS = ["CASH", "UPI", "CARD", "CREDIT"] as const;

/** GET /api/purchases?vendorId=&from=&to= — recent purchases with totals. OWNER only. */
export async function GET(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const vendorId = (url.searchParams.get("vendorId") || "").trim();
    const fromParam = (url.searchParams.get("from") || "").trim();
    const toParam = (url.searchParams.get("to") || "").trim();

    const where: { vendorId?: string; purchasedAt?: { gte?: Date; lte?: Date } } = {};
    if (vendorId) where.vendorId = vendorId;

    const purchasedAt: { gte?: Date; lte?: Date } = {};
    const fromDate = fromParam ? new Date(fromParam + "T00:00:00") : null;
    if (fromDate && !isNaN(fromDate.getTime())) purchasedAt.gte = fromDate;
    const toDate = toParam ? new Date(toParam + "T23:59:59.999") : null;
    if (toDate && !isNaN(toDate.getTime())) purchasedAt.lte = toDate;
    if (purchasedAt.gte || purchasedAt.lte) where.purchasedAt = purchasedAt;

    const purchases = await db.purchase.findMany({
      where,
      orderBy: { purchasedAt: "desc" },
      take: 200,
      include: { vendor: { select: { name: true } } },
    });

    return NextResponse.json({
      purchases: purchases.map((p) => ({
        id: p.id,
        vendorId: p.vendorId,
        vendorName: p.vendor.name,
        itemName: p.itemName,
        fnbItemId: p.fnbItemId,
        qty: p.qty,
        unitRate: p.unitRate,
        total: Math.round(p.total),
        method: p.method,
        note: p.note,
        purchasedAt: p.purchasedAt,
      })),
      purchasesTotal: Math.round(purchases.reduce((sum, p) => sum + p.total, 0)),
      count: purchases.length,
    });
  } catch (e) {
    return serverError(e);
  }
}

/** POST /api/purchases — record a stock-in purchase; linked F&B item stock is incremented. OWNER only. */
export async function POST(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const vendorId = String(body?.vendorId || "").trim();
    const itemName = String(body?.itemName || "").trim();
    const qty = Math.round(Number(body?.qty) || 0);
    const unitRate = Number(body?.unitRate) || 0;
    const fnbItemId = body?.fnbItemId ? String(body.fnbItemId).trim() : null;
    const method = String(body?.method || "CASH").trim().toUpperCase();
    const note = body?.note ? String(body.note).trim() : null;
    const purchasedAt = body?.purchasedAt ? new Date(String(body.purchasedAt)) : new Date();

    if (!vendorId) return badRequest("Vendor is required");
    if (!itemName) return badRequest("Item name is required");
    if (!(qty > 0)) return badRequest("Qty must be greater than 0");
    if (!(unitRate >= 0)) return badRequest("Unit rate must be 0 or more");
    if (!METHODS.includes(method as (typeof METHODS)[number])) return badRequest("Invalid payment method");
    if (body?.purchasedAt && isNaN(purchasedAt.getTime())) return badRequest("Invalid purchase date");

    const vendor = await db.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
    if (!vendor) return badRequest("Vendor not found");

    const total = Math.round(qty * unitRate);

    const purchase = await db.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: { vendorId, itemName, fnbItemId, qty, unitRate, total, method, note, purchasedAt },
        include: { vendor: { select: { name: true } } },
      });

      // Purchase of a linked F&B item raises its stock automatically
      if (fnbItemId) {
        const item = await tx.fnBItem.findUnique({ where: { id: fnbItemId }, select: { id: true } });
        if (item) {
          await tx.fnBItem.update({ where: { id: fnbItemId }, data: { stock: { increment: qty } } });
        }
      }

      return created;
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
