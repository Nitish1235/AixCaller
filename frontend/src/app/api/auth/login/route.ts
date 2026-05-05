import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Invalid email or password" },
        { status: res.status }
      );
    }

    const data = await res.json(); // { tenant_id, email, name }

    const sessionToken = await signSession({
      tenant_id: data.tenant_id,
      email: data.email,
      name: data.name,
      picture: "", // No picture for email/password yet
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
