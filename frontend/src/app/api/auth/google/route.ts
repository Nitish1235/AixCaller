import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/auth";

export function GET() {
  const url = getGoogleAuthUrl();
  return NextResponse.redirect(url);
}
