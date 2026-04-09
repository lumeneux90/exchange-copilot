import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

const AUTH_ROUTE = "/login";
const DEFAULT_PRIVATE_ROUTE = "/";
const PRIVATE_ROUTES = ["/", "/portfolio", "/history"];

function isPrivateRoute(pathname: string) {
  return PRIVATE_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
}

export function proxy(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  if (pathname === AUTH_ROUTE && sessionId) {
    return NextResponse.redirect(new URL(DEFAULT_PRIVATE_ROUTE, request.url));
  }

  if (isPrivateRoute(pathname) && !sessionId) {
    return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/portfolio/:path*", "/history/:path*"],
};
