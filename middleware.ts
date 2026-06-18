import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/roles";

const protectedPagePrefixes = [
  "/dashboard",
  "/broker",
  "/builder",
  "/owner"
];

const adminPrefixes = ["/admin", "/api/admin"];

const publicApiPrefixes = [
  "/api/auth",
  "/api/ai"
];

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiMutation(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return false;
  }

  if (publicApiPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return false;
  }

  return !["GET", "HEAD", "OPTIONS"].includes(request.method);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth =
    startsWithAny(pathname, protectedPagePrefixes) ||
    startsWithAny(pathname, adminPrefixes) ||
    isApiMutation(request);

  if (!requiresAuth) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  });

  if (!token?.id) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (startsWithAny(pathname, adminPrefixes) && !isAdminRole(String(token.role ?? ""))) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
