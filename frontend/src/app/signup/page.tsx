"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

// Public signup goes through the same Google OAuth flow as login —
// the callback (/api/auth/callback) creates a Tenant on first sign-in.
// We auto-redirect to /login after a beat so the user has a moment to
// register what's happening; meanwhile they can hit the button directly.
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/login"), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        backgroundImage:
          "linear-gradient(#e5e5df 1px, transparent 1px), linear-gradient(90deg, #e5e5df 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
          <Link href="/" aria-label="AIxCaller home">
            <Logo size={56} showText={true} dark={false} />
          </Link>
        </div>

        <div
          style={{
            background: "#fff",
            border: "4px solid var(--text)",
            borderRadius: 24,
            boxShadow: "8px 8px 0 var(--text)",
            padding: "2.5rem 2.25rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent-green)",
              border: "2px solid var(--text)",
              padding: "0.4rem 1rem",
              borderRadius: 99,
              fontWeight: 900,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              boxShadow: "3px 3px 0 var(--text)",
              marginBottom: "1.25rem",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--text)",
                display: "inline-block",
              }}
            />
            One-click signup
          </div>

          <h1
            style={{
              margin: 0,
              fontWeight: 900,
              fontSize: "clamp(1.7rem, 3.5vw, 2.2rem)",
              lineHeight: 1.05,
              letterSpacing: -1,
              color: "var(--text)",
              textTransform: "uppercase",
            }}
          >
            We use Google <br />for everything.
          </h1>
          <p
            style={{
              margin: "0.9rem 0 1.75rem",
              fontWeight: 600,
              fontSize: "1rem",
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            No separate signup needed. Sign in with Google and your account
            is created automatically. Taking you to the sign-in page now…
          </p>

          <Link
            href="/login"
            className="btn-brutal"
            style={{ fontSize: "1rem" }}
          >
            Continue →
          </Link>
        </div>
      </div>
    </main>
  );
}
