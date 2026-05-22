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
        background: "var(--surface)",
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(29, 78, 216, 0.04) 0%, transparent 80%), var(--surface)",
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
            background: "#ffffff",
            border: "1.5px solid var(--border)",
            borderRadius: 24,
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
            padding: "3rem 2.5rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--green-light)",
              border: "1.5px solid rgba(5, 150, 105, 0.15)",
              padding: "0.4rem 1.2rem",
              borderRadius: 99,
              fontWeight: 700,
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: "1.25rem",
              color: "var(--green)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
                display: "inline-block",
                boxShadow: "0 0 6px rgba(5, 150, 105, 0.4)",
              }}
            />
            One-click signup
          </div>

          <h1
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: "clamp(1.7rem, 3.5vw, 2.2rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.5px",
              color: "var(--text)",
              textTransform: "none",
            }}
          >
            We use Google for everything.
          </h1>
          <p
            style={{
              margin: "0.9rem 0 1.75rem",
              fontWeight: 500,
              fontSize: "0.95rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            No separate signup needed. Sign in with Google and your account
            is created automatically. Taking you to the sign-in page now…
          </p>

          <Link
            href="/login"
            className="btn-brutal"
            style={{ fontSize: "1rem", width: "100%" }}
          >
            Continue →
          </Link>
        </div>
      </div>
    </main>
  );
}
