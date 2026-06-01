"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Call History has moved to the unified Activity page. */
export default function CallsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/leads"); }, [router]);
  return null;
}
