import { NextRequest, NextResponse } from "next/server";
import { validateSessionValue, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev bypass — skip auth in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Routes that bypass session check
  if (pathname.startsWith("/v/")) return NextResponse.next();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return NextResponse.next();
  if (pathname === "/denied") return NextResponse.next();
  if (pathname === "/api/devices/health") return NextResponse.next();

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
