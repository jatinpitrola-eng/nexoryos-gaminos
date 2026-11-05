import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/types";
import type { Session } from "next-auth";

type GuardResult =
  | { ok: true; session: Session; role: Role }
  | { ok: false; res: NextResponse };

/**
 * API route guard. Usage:
 *   const g = await requireSession();          // any logged-in user
 *   const g = await requireSession(["OWNER"]); // owner only
 *   if (!g.ok) return g.res;
 */
export async function requireSession(roles: Role[] = ["OWNER", "STAFF"]): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 }),
    };
  }
  const role = (session.user.role ?? "STAFF") as Role;
  if (!roles.includes(role)) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Forbidden — owner access required." }, { status: 403 }),
    };
  }
  return { ok: true, session, role };
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : "Something went wrong";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}
