"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Subscription {
  plan_tier: string;
  plan_name: string;
  subscription_status: string;
  minutes_included: number;
  minutes_used: number;
  minutes_left: number;
  cycle_end: string | null;
}

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    if (tenantId) {
      apiGet(`/billing/subscription?tenant_id=${tenantId}`)
        .then(data => setSub(data))
        .catch(err => console.error("Billing fetch error:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div style={{ padding: "2rem", color: "#94a3b8" }}>Loading billing profile...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: "2rem", color: "var(--text)", textTransform: "uppercase", margin: 0 }}>
          Billing & Subscription
        </h1>
        <p style={{ color: "#64748b" }}>Manage your plan, track usage, and view billing history.</p>
      </header>

      {!sub ? (
        <div style={{ padding: "3rem", background: "#f1f5f9", borderRadius: 24, textAlign: "center", border: "2px dashed #cbd5e1" }}>
          <p style={{ fontWeight: 700, color: "#64748b" }}>No subscription found.</p>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Please contact support if you believe this is an error.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* Active Plan Card */}
          <div style={{ 
            background: "var(--text)", color: "#fff", borderRadius: 24, padding: "2.5rem",
            position: "relative", overflow: "hidden", border: "4px solid #fff", boxShadow: "8px 8px 0 #3b82f6"
          }}>
            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                Current Plan
              </div>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "0 0 1rem", textTransform: "uppercase" }}>
                {sub.plan_name}
              </h2>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59, 130, 246, 0.2)", padding: "6px 16px", borderRadius: 999, border: "1px solid #3b82f6" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }}></div>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase" }}>{sub.subscription_status}</span>
              </div>
            </div>
            {/* Aesthetic Background Element */}
            <div style={{ position: "absolute", right: "-20px", bottom: "-20px", fontSize: "10rem", opacity: 0.1, transform: "rotate(-15deg)" }}>💳</div>
          </div>

          {/* Usage Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div style={{ background: "#fff", borderRadius: 24, padding: "2rem", border: "2px solid var(--text)", boxShadow: "4px 4px 0 var(--text)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Minutes Used</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)" }}>{Math.floor(sub.minutes_used)} <span style={{ fontSize: "1rem", color: "#94a3b8" }}>/ {sub.minutes_included}</span></div>
            </div>
            <div style={{ background: "#fff", borderRadius: 24, padding: "2rem", border: "2px solid var(--text)", boxShadow: "4px 4px 0 var(--text)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#3b82f6", textTransform: "uppercase", marginBottom: 8 }}>Minutes Remaining</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)" }}>{Math.floor(sub.minutes_left)}</div>
            </div>
          </div>

          <div style={{ background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: 16, padding: "1rem 1.5rem", color: "#92400e", fontSize: "0.9rem" }}>
            <strong>Billing Cycle:</strong> Your plan 
            {sub.cycle_end ? ` renews on ${new Date(sub.cycle_end).toLocaleDateString()}` : " is currently active"}.
          </div>
        </div>
      )}
    </div>
  );
}
