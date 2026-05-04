import { NextResponse } from "next/server";

export function GET() {
  const response = NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
  response.cookies.set("session", "", { maxAge: 0, path: "/" });
  return response;
}
