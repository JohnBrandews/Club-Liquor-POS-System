import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionJwt } from "@/lib/auth/jwt";

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname.startsWith("/login")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return redirectToLogin(req);

  const session = await verifySessionJwt(token).catch(() => null);
  if (!session) return redirectToLogin(req);

  if (pathname.startsWith("/admin")) {
    if (session.role !== "ADMIN") return NextResponse.redirect(new URL("/pos", req.url));
  }

  if (pathname.startsWith("/reports")) {
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
  }

  if (pathname.startsWith("/inventory") || pathname.startsWith("/staff")) {
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/admin/:path*", "/reports/:path*", "/inventory/:path*", "/staff/:path*"],
};

