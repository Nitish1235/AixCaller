"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface Subscription {
  plan_tier: string;
  plan_name: string;
  subscription_status: string;
  minutes_included: number;
  minutes_used: number;
  minutes_left: number;
  cycle_end: string | null;
}

interface Plan {
  tier: string;
  name: string;
  price_usd: number;
  minutes: number;
  agent_limit: number;
}

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    
    const fetchPromises = [];
    
    if (tenantId) {
      fetchPromises.push(
        apiGet(`/billing/subscription?tenant_id=${tenantId}`)
          .then(data => setSub(data))
          .catch(err => console.error("Billing fetch error:", err))
      );
    }
    
    fetchPromises.push(
      apiGet("/billing/plans")
        .then(data => setPlans(data.plans || []))
        .catch(err => console.error("Plans fetch error:", err))
    );

    Promise.all(fetchPromises).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (tier: string) => {
    setCheckoutLoading(tier);
    const tenantId = localStorage.getItem("tenant_id");
    // Fallback email; in a real app you'd fetch from auth context or prompt the user
    const email = localStorage.getItem("user_email") || "billing@example.com"; 
    
    try {
      const res = await apiPost(`/billing/checkout?tenant_id=${tenantId}&email=${encodeURIComponent(email)}&plan_tier=${tier}`, {});
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Skeleton header */}
      <div style={{ height: 36, width: 240, background: "#f1f5f9", borderRadius: 8, animation: "pulse 1.5s ease infinite" }} />
      {/* Skeleton plan card */}
      <div style={{ height: 180, borderRadius: 24, background: "linear-gradient(135deg, #dbeafe, #eff6ff)", animation: "pulse 1.5s ease infinite" }} />
      {/* Skeleton stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {[1,2].map(i => <div key={i} style={{ height: 100, borderRadius: 24, background: "#f1f5f9", animation: "pulse 1.5s ease infinite" }} />)}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );

  return (
    <div>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "var(--text)", margin: 0, letterSpacing: "-0.5px" }}>
          Billing & Subscription
        </h1>
        <p style={{ color: "#64748b" }}>Manage your plan, track usage, and upgrade for more volume.</p>
      </header>

      {!sub ? (
        <div style={{ padding: "3rem", background: "var(--surface)", borderRadius: 24, textAlign: "center", border: "2px dashed var(--border)", marginBottom: "2rem" }}>
          <p style={{ fontWeight: 700, color: "var(--text-muted)" }}>No active subscription found.</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Select a plan below to get started.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "2rem", marginBottom: "3rem" }}>
          {/* Active Plan Card */}
          <div style={{ 
            background: "linear-gradient(135deg, var(--blue), #3b82f6)", color: "#fff", borderRadius: 24, padding: "2.5rem",
            position: "relative", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 10px 25px -5px rgba(29, 78, 216, 0.15), 0 8px 10px -6px rgba(29, 78, 216, 0.15)"
          }}>
            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "rgba(255, 255, 255, 0.8)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                Current Plan
              </div>
              <h2 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "0 0 1rem", textTransform: "uppercase" }}>
                {sub.plan_name}
              </h2>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255, 255, 255, 0.15)", padding: "6px 16px", borderRadius: 999, border: "1px solid rgba(255, 255, 255, 0.3)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sub.subscription_status === "active" ? "#10b981" : "#f59e0b" }}></div>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase" }}>{sub.subscription_status}</span>
              </div>
            </div>
            {/* Aesthetic Background Element */}
            <div style={{ position: "absolute", right: "-20px", bottom: "-20px", fontSize: "10rem", opacity: 0.1, transform: "rotate(-15deg)", userSelect: "none" }}>💳</div>
          </div>

          {/* Usage Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            <div style={{ background: "#fff", borderRadius: 24, padding: "2rem", border: "1.5px solid var(--border)", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Minutes Used</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text)" }}>{Math.floor(sub.minutes_used)} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ {sub.minutes_included}</span></div>
              {/* Usage bar */}
              <div style={{ marginTop: 12, height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${Math.min(100, sub.minutes_included > 0 ? (sub.minutes_used / sub.minutes_included) * 100 : 100)}%`,
                  background: sub.minutes_left <= 0 ? "#ef4444" : sub.minutes_left / sub.minutes_included < 0.15 ? "#f59e0b" : "var(--blue)",
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
            <div style={{
              background: sub.minutes_left <= 0 ? "#fef2f2" : "#fff",
              borderRadius: 24, padding: "2rem",
              border: `1.5px solid ${sub.minutes_left <= 0 ? "#fecaca" : "var(--border)"}`,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)"
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: sub.minutes_left <= 0 ? "#ef4444" : "var(--blue)", textTransform: "uppercase", marginBottom: 8 }}>
                {sub.minutes_left <= 0 ? "⚠ Minutes Exhausted" : "Minutes Remaining"}
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: sub.minutes_left <= 0 ? "#ef4444" : "var(--text)" }}>
                {Math.floor(sub.minutes_left)}
              </div>
              {sub.minutes_left <= 0 && (
                <div style={{ fontSize: "0.78rem", color: "#dc2626", marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>
                  Inbound and outbound calls are blocked until your plan renews or you upgrade.
                </div>
              )}
            </div>
          </div>

          {/* Low-minutes warning banner */}
          {sub.minutes_left > 0 && sub.minutes_included > 0 && (sub.minutes_left / sub.minutes_included) < 0.15 && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 12 }}>
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#92400e" }}>You're running low — {Math.floor(sub.minutes_left)} minutes left</div>
                <div style={{ fontSize: "0.8rem", color: "#b45309", marginTop: 2, lineHeight: 1.5 }}>
                  When minutes reach zero, all inbound and outbound calls will be blocked automatically.
                  Upgrade now to avoid interruption.
                </div>
              </div>
            </div>
          )}

          <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1.5px solid rgba(245, 158, 11, 0.2)", borderRadius: 16, padding: "1rem 1.5rem", color: "#b45309", fontSize: "0.9rem" }}>
            <strong>Billing Cycle:</strong> Your plan 
            {sub.cycle_end ? ` renews on ${new Date(sub.cycle_end).toLocaleDateString()}` : " is currently active"}.
          </div>
        </div>
      )}

      {/* Upgrade Section */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--text)", marginBottom: "1.5rem", letterSpacing: "-0.3px" }}>
          Available Plans
        </h2>
        {checkoutError && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--red-light)", border: "1px solid #fca5a5", borderRadius: 10, marginBottom: "1.25rem", fontSize: "0.85rem", color: "var(--red)", fontWeight: 600 }}>
            <span>⚠</span> {checkoutError}
            <button onClick={() => setCheckoutError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {plans.map((plan) => {
            const isCurrentPlan = sub?.plan_tier === plan.tier;
            return (
              <div key={plan.tier} style={{
                background: "#fff",
                borderRadius: 24,
                padding: "2rem",
                border: isCurrentPlan ? "2px solid var(--blue)" : "1.5px solid var(--border)",
                boxShadow: isCurrentPlan ? "0 10px 25px -5px rgba(29, 78, 216, 0.08)" : "0 4px 20px rgba(0, 0, 0, 0.02)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "var(--transition)"
              }}>
                {isCurrentPlan && (
                  <div style={{ position: "absolute", top: -12, right: 24, background: "var(--blue)", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>
                    Current Plan
                  </div>
                )}
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.5rem" }}>{plan.name}</h3>
                <div style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "1.5rem" }}>
                  ${plan.price_usd} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600 }}>/mo</span>
                </div>
                
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", flexGrow: 1, color: "var(--text-muted)", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: 12 }}>
                  <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>✅</span> {plan.minutes} included minutes
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>✅</span> Up to {plan.agent_limit} active agents
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>✅</span> Standard integrations
                  </li>
                </ul>

                <button 
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={checkoutLoading === plan.tier || isCurrentPlan}
                  style={{
                    background: isCurrentPlan ? "#f1f5f9" : "var(--blue)",
                    color: isCurrentPlan ? "#94a3b8" : "#fff",
                    border: "none",
                    padding: "0.75rem 1rem",
                    borderRadius: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    cursor: isCurrentPlan ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {checkoutLoading === plan.tier ? "Loading..." : isCurrentPlan ? "Active" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
