import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { ensureSeedData } from "@/lib/bootstrap";

export const runtime = "nodejs";

/** Public: create a new zone OWNER account. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
    }

    const user = await db.user.create({
      data: { name, email, passwordHash: hashPassword(password), role: "OWNER" },
    });

    // Make sure a brand-new owner sees a usable zone (seed once, idempotent)
    await ensureSeedData();

    return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
