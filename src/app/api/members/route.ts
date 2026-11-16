import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** GET /api/members?q= — search customers (phone or name). Contract used across the app. */
export async function GET(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    const customers = await db.customer.findMany({
      where: q
        ? {
            OR: [{ phone: { contains: q } }, { name: { contains: q } }],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        walletBalance: true,
        loyaltyPoints: true,
        bonusMinutes: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        walletBalance: c.walletBalance,
        loyaltyPoints: c.loyaltyPoints,
        bonusMinutes: c.bonusMinutes,
        createdAt: c.createdAt,
        membershipsCount: c._count.memberships,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

/** POST /api/members — create a customer. */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const phoneRaw = String(body?.phone || "").trim();
    const email = body?.email ? String(body.email).trim() : null;
    const phone = phoneRaw.replace(/[\s-]/g, "");

    if (!name) return badRequest("Name is required");
    if (!/^\+?\d{10,13}$/.test(phone)) return badRequest("Please enter a valid phone number (10-13 digits)");

    const existing = await db.customer.findUnique({ where: { phone } });
    if (existing) return badRequest("A customer with this phone already exists");

    const customer = await db.customer.create({ data: { name, phone, email } });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
