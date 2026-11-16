import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, notFound, serverError } from "@/lib/guards";

export const runtime = "nodejs";

/** DELETE /api/expenses/[id] — remove an expense. OWNER only. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const { id } = await params;

    const existing = await db.expense.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return notFound("Expense not found");

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
