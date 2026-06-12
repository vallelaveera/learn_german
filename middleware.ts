import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/demo/", "/demo/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Public SVG assets — must load in <img> without auth redirects
  if (pathname.startsWith("/api/icons/")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/illustrations/")) {
    return NextResponse.next();
  }

  // Check auth token
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = verifyToken(token);
  if (!user) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("auth_token");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
