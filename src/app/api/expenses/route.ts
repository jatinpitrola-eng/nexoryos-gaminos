import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types";
import { startOfDay, endOfDay } from "@/lib/hours";

export const runtime = "nodejs";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** GET /api/expenses?month=YYYY-MM — month list + summary + recent 20 (any month). OWNER only. */
export async function GET(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month") || "";
    const now = new Date();
    const [year, month] = MONTH_RE.test(monthParam)
      ? [Number(monthParam.slice(0, 4)), Number(monthParam.slice(5, 7))]
      : [now.getFullYear(), now.getMonth() + 1];

    const from = startOfDay(new Date(year, month - 1, 1));
    const to = endOfDay(new Date(year, month, 0)); // last day of month

    const [expenses, recent] = await Promise.all([
      db.expense.findMany({
        where: { date: { gte: from, lte: to } },
        orderBy: { date: "desc" },
        select: { id: true, title: true, category: true, amount: true, date: true },
      }),
      db.expense.findMany({
        orderBy: { date: "desc" },
        take: 20,
        select: { id: true, title: true, category: true, amount: true, date: true },
      }),
    ]);

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = EXPENSE_CATEGORIES.map((category) => ({
      category,
      amount: expenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
    }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      expenses,
      summary: { total: Math.round(total * 100) / 100, byCategory },
      recent,
    });
  } catch (e) {
    return serverError(e);
  }
}

/** POST /api/expenses — log an expense. OWNER only. */
export async function POST(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    const category = String(body?.category || "").trim() as ExpenseCategory;
    const amount = Number(body?.amount);
    const date = body?.date && !isNaN(new Date(body.date).getTime()) ? new Date(body.date) : new Date();

    if (title.length < 2 || title.length > 80) return badRequest("Title must be 2-80 characters");
    if (!EXPENSE_CATEGORIES.includes(category)) return badRequest("Invalid category");
    if (!(amount > 0)) return badRequest("Amount must be greater than 0");

    const expense = await db.expense.create({
      data: { title, category, amount, date },
      select: { id: true, title: true, category: true, amount: true, date: true },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
