"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:         "You denied Google access. Please try again.",
  token_exchange_failed: "Failed to authenticate with Google. Please try again.",
  userinfo_failed:       "Could not fetch your Google profile. Please try again.",
  backend_sync_failed:   "Account setup failed. Please try again or contact support.",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10, boxSizing: "border-box",
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
};

function LoginContent() {
  const params = useSearchParams();
  const router = useRouter();
  const errorKey = params.get("error");
  const errorMsg = errorKey ? ERROR_MESSAGES[errorKey] : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Login failed");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setFormError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#F0FDF4 0%,#ECFDF5 50%,#F6FEFA 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#064E3B,#10B981)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
          }}>🎙️</div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: "1.5rem", color: "#064E3B", letterSpacing: -0.5 }}>
            Welcome back
          </h1>
          <p style={{ margin: "6px 0 0", color: "#9CA3AF", fontSize: "0.9rem" }}>
            Sign in to your AIxCaller dashboard
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: 20, padding: "2rem",
          border: "1.5px solid #D1FAE5", boxShadow: "0 8px 40px rgba(16,185,129,0.12)",
        }}>

          {/* Error */}
          {(errorMsg || formError) && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
              padding: "12px 14px", fontSize: "0.85rem", color: "#DC2626", marginBottom: "1.5rem",
            }}>
              ⚠️ {errorMsg || formError}
            </div>
          )}

          {/* Google OAuth — Primary */}
          <a href="/api/auth/google" style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 12, padding: "13px", borderRadius: 12, border: "1.5px solid #E5E7EB",
              background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem",
              color: "#374151", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </a>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.5rem 0" }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span style={{ fontSize: "0.78rem", color: "#9CA3AF", fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Email Address
              </label>
              <input type="email" placeholder="you@company.com" style={inp} required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Password
              </label>
              <input type="password" placeholder="••••••••" style={inp} required
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: "#064E3B", color: "#fff", border: "none",
              borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.82rem", color: "#9CA3AF" }}>
            Don't have an account?{" "}
            <Link href="/signup" style={{ color: "#10B981", fontWeight: 700, textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.75rem", color: "#9CA3AF" }}>
          By continuing, you agree to our{" "}
          <Link href="/terms" style={{ color: "#10B981", textDecoration: "none" }}>Terms</Link>
          {" & "}
          <Link href="/privacy" style={{ color: "#10B981", textDecoration: "none" }}>Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}
