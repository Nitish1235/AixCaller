"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inp: React.CSSProperties = {
  width: "100%", padding: "14px 18px", borderRadius: 12, boxSizing: "border-box",
  border: "2px solid #E5E7EB", fontSize: "1rem", color: "#1e293b",
  outline: "none", fontFamily: "inherit", background: "#f8fafc",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // We send 'username' as 'email' to match the existing API expectation
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, password }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Access Denied");
        setLoading(false);
      } else {
        // Store session and redirect
        localStorage.setItem("tenant_id", data.tenant_id);
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Connection failed. Please check your backend.");
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh", 
      background: "#020617",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{
            width: 70, height: 70, borderRadius: 20, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
            boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)"
          }}>🎙️</div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: "2rem", color: "#fff", letterSpacing: -1 }}>
            AIxCaller <span style={{ color: "#3b82f6" }}>Pro</span>
          </h1>
          <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: "1rem" }}>
            Restricted Management Console
          </p>
        </div>

        {/* Login Form */}
        <div style={{
          background: "#0f172a", borderRadius: 32, padding: "3rem 2.5rem",
          border: "1px solid #1e293b", boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}>
          {error && (
            <div style={{
              background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 12,
              padding: "14px", fontSize: "0.9rem", color: "#fca5a5", marginBottom: "2rem",
              textAlign: "center", fontWeight: 600
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 800, fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 }}>
                Authorized User
              </label>
              <input 
                type="text" 
                placeholder="Enter username" 
                style={inp} 
                required
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 800, fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5 }}>
                Master Password
              </label>
              <input 
                type="password" 
                placeholder="••••••••" 
                style={inp} 
                required
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                width: "100%", 
                background: "linear-gradient(to right, #3b82f6, #2563eb)", 
                color: "#fff", 
                border: "none",
                borderRadius: 12, 
                padding: "16px", 
                fontWeight: 900, 
                fontSize: "1rem",
                textTransform: "uppercase",
                letterSpacing: 1,
                cursor: loading ? "not-allowed" : "pointer", 
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)",
                marginTop: "1rem"
              }}
            >
              {loading ? "Verifying..." : "Unlock Platform"}
            </button>
          </form>

          <div style={{ marginTop: "2.5rem", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "1.5rem" }}>
            <p style={{ fontSize: "0.75rem", color: "#475569", margin: 0 }}>
              System strictly monitored. <br/>Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
