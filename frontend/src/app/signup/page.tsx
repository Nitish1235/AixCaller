"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Public signup is disabled per system lockdown requirements
    router.replace("/login");
  }, [router]);

  return (
    <main style={{
      minHeight: "100vh", background: "#020617",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontWeight: 900, fontSize: "1.5rem" }}>Redirecting to Login...</h1>
        <p style={{ color: "#64748b" }}>Public registration is currently restricted.</p>
      </div>
    </main>
  );
}
