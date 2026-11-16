import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/stations",
  "/bookings",
  "/pricing",
  "/members",
  "/pos",
  "/shifts",
  "/billing",
  "/reports",
  "/settings",
  "/tournaments",
  "/expenses",
];
const OWNER_ONLY = ["/reports", "/pricing", "/settings", "/expenses"];
const AUTH_PAGES = ["/login", "/signup"];
const SECRET = process.env.NEXTAUTH_SECRET || "gaminos-nexoryos-secret-2025-xyz";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: SECRET });

  // Logged-in users skip the auth pages
  if (AUTH_PAGES.includes(pathname)) {
    if (token) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as { role?: string }).role;
  if (OWNER_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/")) && role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|nexoryos.png|.*\\.(?:png|jpg|jpeg|svg|ico|txt|xml|webp)$).*)"],
};
