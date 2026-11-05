import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

/** POST /api/settings/staff — OWNER creates a STAFF account. */
export async function POST(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");

    if (!name || !email || !password) return badRequest("Name, email and password are required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Please enter a valid email address");
    if (password.length < 6) return badRequest("Password must be at least 6 characters");

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return badRequest("Email already in use");

    const user = await db.user.create({
      data: { name, email, passwordHash: hashPassword(password), role: "STAFF" },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
