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
    } catch (err) {
      console.error("Checkout failed", err);
      alert("Failed to initiate checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) return <div style={{ padding: "2rem", color: "#94a3b8" }}>Loading billing profile...</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: "2rem", color: "var(--text)", textTransform: "uppercase", margin: 0 }}>
          Billing & Subscription
        </h1>
        <p style={{ color: "#64748b" }}>Manage your plan, track usage, and upgrade for more volume.</p>
      </header>

      {!sub ? (
        <div style={{ padding: "3rem", background: "#f1f5f9", borderRadius: 24, textAlign: "center", border: "2px dashed #cbd5e1", marginBottom: "2rem" }}>
          <p style={{ fontWeight: 700, color: "#64748b" }}>No active subscription found.</p>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Select a plan below to get started.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "2rem", marginBottom: "3rem" }}>
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
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sub.subscription_status === "active" ? "#10b981" : "#f59e0b" }}></div>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase" }}>{sub.subscription_status}</span>
              </div>
            </div>
            {/* Aesthetic Background Element */}
            <div style={{ position: "absolute", right: "-20px", bottom: "-20px", fontSize: "10rem", opacity: 0.1, transform: "rotate(-15deg)", userSelect: "none" }}>💳</div>
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

      {/* Upgrade Section */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--text)", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          Available Plans
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {plans.map((plan) => {
            const isCurrentPlan = sub?.plan_tier === plan.tier;
            return (
              <div key={plan.tier} style={{
                background: "#fff",
                borderRadius: 24,
                padding: "2rem",
                border: isCurrentPlan ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                boxShadow: isCurrentPlan ? "4px 4px 0 #3b82f6" : "none",
                display: "flex",
                flexDirection: "column",
                position: "relative"
              }}>
                {isCurrentPlan && (
                  <div style={{ position: "absolute", top: -12, right: 24, background: "#3b82f6", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>
                    Current Plan
                  </div>
                )}
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.5rem" }}>{plan.name}</h3>
                <div style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "1.5rem" }}>
                  ${plan.price_usd} <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>/mo</span>
                </div>
                
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", flexGrow: 1, color: "#475569", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: 12 }}>
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
                    background: isCurrentPlan ? "#f1f5f9" : "var(--text)",
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
