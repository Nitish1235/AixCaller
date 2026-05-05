import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getGoogleUser,
  signSession,
} from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.url;

  // User denied access
  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=access_denied", baseUrl));
  }

  // 1. Exchange code → tokens
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", baseUrl));
  }

  // 2. Get Google user info
  const googleUser = await getGoogleUser(tokens.access_token);
  if (!googleUser) {
    return NextResponse.redirect(new URL("/login?error=userinfo_failed", baseUrl));
  }

  // 3. Sync user with backend → creates Tenant if first login
  let tenantId: string;
  try {
    const syncRes = await fetch(`${API_URL}/api/v1/auth/sync-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        google_id:   googleUser.id,
        email:       googleUser.email,
        name:        googleUser.name,
        picture:     googleUser.picture,
      }),
    });

    if (!syncRes.ok) throw new Error("Backend sync failed");
    const data = await syncRes.json();
    tenantId = data.tenant_id;
  } catch {
    return NextResponse.redirect(new URL("/login?error=backend_sync_failed", baseUrl));
  }

  // 4. Create signed session JWT and set as httpOnly cookie
  const sessionToken = await signSession({
    tenant_id: tenantId,
    email:     googleUser.email,
    name:      googleUser.name,
    picture:   googleUser.picture,
  });

  const response = NextResponse.redirect(new URL("/dashboard", baseUrl));
  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     "/",
  });

  return response;
}
