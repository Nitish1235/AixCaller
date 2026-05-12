"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inp: React.CSSProperties = {
  width: "100%", padding: "12px 16px", borderRadius: 12, boxSizing: "border-box",
  border: "2px solid var(--text)", fontSize: "1rem", color: "var(--text)",
  outline: "none", fontFamily: "inherit", background: "#fff",
  transition: "all 0.2s"
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Signup failed");
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
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
      backgroundImage: "linear-gradient(#e5e5df 1px, transparent 1px), linear-gradient(90deg, #e5e5df 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
            background: "var(--accent-green)", border: "var(--border)", boxShadow: "4px 4px 0 var(--text)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem",
          }}>🎙️</div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: "2rem", textTransform: "uppercase", letterSpacing: -1 }}>
            Start for free
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--text)", fontWeight: 600, fontSize: "1rem" }}>
            Deploy your first AI voice agent in 5 minutes
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "3rem 2.5rem" }}>

          {/* Error */}
          {formError && (
            <div style={{
              background: "var(--accent-pink)", border: "2px solid var(--text)", borderRadius: 12,
              padding: "12px 14px", fontSize: "0.9rem", color: "var(--text)", fontWeight: 700, marginBottom: "1.5rem",
              boxShadow: "3px 3px 0 var(--text)"
            }}>
              ⚠️ {formError}
            </div>
          )}

          {/* Feature chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "2rem", justifyContent: "center" }}>
            {["✅ Free 500 min", "🤖 AI Voice Agents", "📞 Global Numbers", "📊 Analytics"].map(f => (
              <span key={f} style={{
                fontSize: "0.75rem", fontWeight: 800, padding: "6px 12px", borderRadius: 999,
                background: "#fff", color: "var(--text)", border: "2px solid var(--text)", boxShadow: "2px 2px 0 var(--text)"
              }}>{f}</span>
            ))}
          </div>

          {/* Google OAuth — Primary */}
          <a href="/api/auth/google" style={{ textDecoration: "none" }}>
            <button style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 12, padding: "14px", borderRadius: 99, border: "2px solid var(--text)",
              background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "1rem",
              color: "var(--text)", transition: "all 0.1s", boxShadow: "4px 4px 0 var(--text)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>
          </a>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2rem 0" }}>
            <div style={{ flex: 1, height: 2, background: "var(--text)" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 800 }}>OR</span>
            <div style={{ flex: 1, height: 2, background: "var(--text)" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 900, fontSize: "0.85rem", color: "var(--text)", textTransform: "uppercase" }}>Full Name</label>
              <input type="text" placeholder="Jane Doe" style={inp} required
                value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 900, fontSize: "0.85rem", color: "var(--text)", textTransform: "uppercase" }}>Email Address</label>
              <input type="email" placeholder="you@company.com" style={inp} required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 900, fontSize: "0.85rem", color: "var(--text)", textTransform: "uppercase" }}>Password</label>
              <input type="password" placeholder="••••••••" style={inp} required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: "var(--accent-yellow)", color: "var(--text)", border: "2px solid var(--text)",
              borderRadius: 99, padding: "14px", fontWeight: 900, fontSize: "1.1rem", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "4px 4px 0 var(--text)", marginTop: "1rem"
            }}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.9rem", color: "var(--text)", fontWeight: 600 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent-green)", fontWeight: 900, textDecoration: "underline", textUnderlineOffset: 4 }}>
              Sign in
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem", color: "var(--text)", fontWeight: 600 }}>
          By signing up, you agree to our{" "}
          <Link href="/terms" style={{ textDecoration: "underline" }}>Terms</Link>
          {" & "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
