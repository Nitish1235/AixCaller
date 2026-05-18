"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

// Map the error codes our /api/auth/callback route returns into
// human-readable copy. Keep messages short — this is a brutalist UI.
const ERROR_MESSAGES: Record<string, string> = {
  access_denied:         "You cancelled the sign-in. No worries — try again when ready.",
  token_exchange_failed: "Google didn't accept the sign-in. Please try again.",
  userinfo_failed:       "Couldn't read your Google profile. Please try again.",
  backend_sync_failed:   "Our servers had a hiccup syncing your account. Try once more.",
};

function LoginInner() {
  const params = useSearchParams();
  const errorCode = params.get("error");
  const errorMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Sign-in failed. Please try again.") : "";

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
      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* Brand */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <Link href="/" aria-label="AIxCaller home">
            <Logo size={56} showText={true} dark={false} />
          </Link>
        </div>

        {/* Brutalist card */}
        <div
          style={{
            background: "#fff",
            border: "4px solid var(--text)",
            borderRadius: 24,
            boxShadow: "8px 8px 0 var(--text)",
            padding: "2.5rem 2.25rem",
          }}
        >
          {/* Eyebrow badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent-yellow)",
              border: "2px solid var(--text)",
              padding: "0.4rem 1rem",
              borderRadius: 99,
              fontWeight: 900,
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              boxShadow: "3px 3px 0 var(--text)",
              marginBottom: "1.5rem",
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
            Sign in
          </div>

          <h1
            style={{
              margin: 0,
              fontWeight: 900,
              fontSize: "clamp(1.9rem, 3.5vw, 2.4rem)",
              lineHeight: 1.05,
              letterSpacing: -1,
              color: "var(--text)",
              textTransform: "uppercase",
            }}
          >
            Welcome <br />back.
          </h1>
          <p
            style={{
              margin: "0.9rem 0 2rem",
              fontWeight: 600,
              fontSize: "1rem",
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            Continue with your Google account. No passwords to remember —
            we use Google to keep your account secure.
          </p>

          {errorMsg && (
            <div
              role="alert"
              style={{
                background: "var(--accent-pink)",
                border: "2px solid var(--text)",
                borderRadius: 12,
                padding: "0.85rem 1rem",
                fontSize: "0.92rem",
                color: "var(--text)",
                fontWeight: 700,
                marginBottom: "1.5rem",
                boxShadow: "3px 3px 0 var(--text)",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Google button — full-width, brutalist, official Google "G" mark */}
          <a
            href="/api/auth/google"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: "100%",
              background: "#fff",
              color: "var(--text)",
              border: "3px solid var(--text)",
              borderRadius: 14,
              padding: "0.95rem 1.25rem",
              fontWeight: 900,
              fontSize: "1.05rem",
              textTransform: "none",
              cursor: "pointer",
              boxShadow: "5px 5px 0 var(--text)",
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(5px,5px)";
              e.currentTarget.style.boxShadow = "0 0 0 var(--text)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "5px 5px 0 var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "5px 5px 0 var(--text)";
            }}
          >
            <GoogleG />
            Continue with Google
          </a>

          {/* Trust line */}
          <div
            style={{
              marginTop: "1.75rem",
              paddingTop: "1.25rem",
              borderTop: "2px dashed #cbd5e1",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#64748b",
                textAlign: "center",
              }}
            >
              By continuing you agree to our{" "}
              <Link href="/terms" style={{ textDecoration: "underline" }}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" style={{ textDecoration: "underline" }}>
                Privacy Policy
              </Link>
              .
            </div>
          </div>
        </div>

        {/* Bottom helper */}
        <div
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "#475569",
          }}
        >
          New here?{" "}
          <Link
            href="/api/auth/google"
            style={{ color: "var(--text)", textDecoration: "underline" }}
          >
            Sign up with Google
          </Link>{" "}
          — same button, we&apos;ll create your account automatically.
        </div>
      </div>
    </main>
  );
}

// Official Google "G" mark (multi-color). Inline SVG so we don't add an asset.
function GoogleG() {
  return (
    <svg width={22} height={22} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C41 35 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default function LoginPage() {
  // useSearchParams() must be wrapped in <Suspense> in app-router pages.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
