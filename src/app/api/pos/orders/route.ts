import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/**
 * POST /api/pos/orders
 * { sessionId?, items: [{ itemId, qty }] }
 * - sessionId → order status OPEN (merged into session bill at checkout)
 * - no sessionId → standalone counter sale, status PAID (assumed cash)
 * Stock decremented transactionally; total computed from DB prices.
 */
export async function POST(req: Request) {
  try {
    const g = await requireSession();
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const sessionId = body?.sessionId ? String(body.sessionId) : null;
    const lineItems: { itemId: string; qty: number }[] = Array.isArray(body?.items) ? body.items : [];

    if (lineItems.length === 0) return badRequest("Add at least one item");
    for (const li of lineItems) {
      if (!li?.itemId || !(Number(li.qty) > 0)) return badRequest("Invalid order line");
    }

    const ids = lineItems.map((li) => li.itemId);
    const items = await db.fnBItem.findMany({ where: { id: { in: ids }, isActive: true } });
    if (items.length !== new Set(ids).size) return badRequest("Some items are unavailable");

    for (const li of lineItems) {
      const item = items.find((i) => i.id === li.itemId)!;
      if (item.stock < li.qty) return badRequest(`Only ${item.stock} left of ${item.name}`);
    }

    if (sessionId) {
      const session = await db.session.findUnique({ where: { id: sessionId } });
      if (!session) return badRequest("Session not found");
      if (session.status !== "ACTIVE") return badRequest("That session has ended — sell standalone instead");
    }

    const total = lineItems.reduce((sum, li) => {
      const item = items.find((i) => i.id === li.itemId)!;
      return sum + item.price * li.qty;
    }, 0);

    const result = await db.$transaction(async (tx) => {
      const order = await tx.fnBOrder.create({
        data: {
          sessionId,
          items: JSON.stringify(
            lineItems.map((li) => {
              const item = items.find((i) => i.id === li.itemId)!;
              return { itemId: item.id, name: item.name, price: item.price, qty: li.qty };
            })
          ),
          total: Math.round(total),
          status: sessionId ? "OPEN" : "PAID",
        },
      });
      const updatedItems: { id: string; stock: number }[] = [];
      for (const li of lineItems) {
        updatedItems.push(
          await tx.fnBItem.update({ where: { id: li.itemId }, data: { stock: { decrement: li.qty } } })
        );
      }
      return { order, items: updatedItems };
    });

    return NextResponse.json(
      {
        order: { id: result.order.id, total: result.order.total, status: result.order.status, sessionId: result.order.sessionId },
        items: result.items.map((i) => ({ id: i.id, stock: i.stock })),
      },
      { status: 201 }
    );
  } catch (e) {
    return serverError(e);
  }
}
