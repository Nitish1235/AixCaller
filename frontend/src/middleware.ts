import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/api/auth", "/contact", "/terms", "/privacy", "/themes"];

export async function middleware(req: NextNextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all public paths + static assets
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith("/_next") || pathname.startsWith("/favicon"));
  if (isPublic) return NextResponse.next();

  // Protect /dashboard and any other private route
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await verifySession(token);
  if (!user) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.set("session", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Inject user headers so Server Components can read them
  const headers = new Headers(req.headers);
  headers.set("x-user-email",     user.email);
  headers.set("x-user-name",      user.name);
  headers.set("x-user-tenant-id", user.tenant_id);
  headers.set("x-user-picture",   user.picture);

  const response = NextResponse.next({ request: { headers } });
  // Expose tenant_id to the client-side JavaScript via a non-httpOnly cookie
  response.cookies.set("tenant_id", user.tenant_id, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Fix typo
type NextNextRequest = NextRequest;
