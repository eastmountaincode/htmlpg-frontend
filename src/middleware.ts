import { NextRequest, NextResponse } from "next/server";
import { validateSessionValue, SESSION_COOKIE_NAME } from "@/lib/session";
import { ADMIN_COOKIE_NAME, validateAdminCookie } from "@/lib/admin-session";

export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev bypass — skip auth in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Routes that bypass session check
  if (pathname.startsWith("/v/")) return NextResponse.next();
  if (pathname === "/denied") return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.next(); // API routes used by devices

  // Admin routes — password-protected via admin cookie
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Login page is always accessible
    if (pathname === "/admin/login") return NextResponse.next();

    const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret || !adminCookie || !validateAdminCookie(sessionSecret, adminCookie)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // Session validation for all other routes
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    console.error("[Middleware] SESSION_SECRET not configured");
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  const result = validateSessionValue(sessionSecret, sessionCookie);

  if (!result.valid) {
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
