"use client";
import { useEffect, useState } from "react";

interface CallRecord {
  id: string;
  from_number: string;
  to_number: string;
  status: string;
  duration_seconds: number;
  summary: string | null;
  sentiment: string | null;
  action_items: string | null;
  created_at: string;
}

interface Subscription {
  plan_tier: string;
  plan_name: string;
  subscription_status: string;
  minutes_included: number;
  minutes_used: number;
  minutes_left: number;
  cycle_start: string | null;
  cycle_end: string | null;
}

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff",
  border: "1.5px solid #D1FAE5",
  borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)",
  ...extra,
});

const SENTIMENT_COLORS: Record<string, { bg: string; fg: string }> = {
  happy:       { bg: "#D1FAE5", fg: "#059669" },
  neutral:     { bg: "#E5E7EB", fg: "#6B7280" },
  frustrated:  { bg: "#FEE2E2", fg: "#DC2626" },
};

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LiveMonitorPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  // Fetch tenant_id from localStorage (set on login)
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadData = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      const [callsRes, subRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/calls?tenant_id=${tenantId}`),
        fetch(`${apiUrl}/api/v1/billing/subscription?tenant_id=${tenantId}`),
      ]);
      if (callsRes.ok) setCalls(await callsRes.json());
      if (subRes.ok) setSub(await subRes.json());
    } catch (e) {
      console.error("Failed to load monitor data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15s to pick up new calls
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const usagePercent = sub && sub.minutes_included > 0
    ? Math.min(100, (sub.minutes_used / sub.minutes_included) * 100)
    : 0;

  const usageColor = usagePercent > 90 ? "#DC2626" : usagePercent > 70 ? "#F59E0B" : "#10B981";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>
          Calls & Usage
        </h1>
        <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>
          Review every call summary and track your plan minutes.
        </p>
      </div>

      {/* Plan Usage Card */}
      {sub && (
        <div style={card({ padding: "1.75rem 2rem" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase" }}>
                Current Plan
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#064E3B" }}>
                  {sub.plan_name}
                </span>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700, letterSpacing: 0.5,
                  padding: "3px 10px", borderRadius: 12,
                  background: sub.subscription_status === "active" ? "#D1FAE5" : "#FEE2E2",
                  color: sub.subscription_status === "active" ? "#059669" : "#DC2626",
                }}>
                  {sub.subscription_status.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase" }}>
                Minutes Used
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#064E3B", marginTop: 4 }}>
                {sub.minutes_used.toFixed(1)}
                <span style={{ color: "#9CA3AF", fontWeight: 600, fontSize: "1rem" }}> / {sub.minutes_included}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: "#F3F4F6", height: 10, borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${usagePercent}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${usageColor}, ${usageColor}cc)`,
              transition: "width 0.4s ease",
              borderRadius: 999,
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: "0.82rem", color: "#6B7280" }}>
            <span>
              <strong style={{ color: usageColor }}>{sub.minutes_left.toFixed(1)} minutes</strong> remaining this cycle
            </span>
            {sub.cycle_end && (
              <span>Renews {new Date(sub.cycle_end).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
            )}
          </div>
          {usagePercent > 80 && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: "0.82rem", color: "#92400E" }}>
              ⚠️ You've used over 80% of your monthly minutes. Consider upgrading to avoid service interruption.
            </div>
          )}
        </div>
      )}

      {/* Calls List */}
      <div style={card({ overflow: "hidden" })}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: 0 }}>
            Recent Calls — Summaries
          </h2>
          <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
            {calls.length} call{calls.length !== 1 ? "s" : ""} · auto-refresh every 15s
          </span>
        </div>

        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Loading...</div>
          ) : calls.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 1.25rem" }}>
                📞
              </div>
              <div style={{ fontWeight: 700, color: "#064E3B", marginBottom: 6 }}>No calls yet</div>
              <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>
                When your AI agent receives a call, the summary will show up here.
              </div>
            </div>
          ) : (
            calls.map(call => {
              const sentColors = call.sentiment ? SENTIMENT_COLORS[call.sentiment.toLowerCase()] : null;
              return (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid #F3F4F6",
                    cursor: "pointer",
                    background: selectedCall?.id === call.id ? "#F6FEFA" : "#fff",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #064E3B, #10B981)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.95rem" }}>
                        📞
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#064E3B", fontSize: "0.95rem" }}>
                          {call.from_number}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#9CA3AF", marginTop: 2 }}>
                          {fmtDate(call.created_at)} · {fmtDuration(call.duration_seconds)}
                        </div>
                      </div>
                    </div>
                    {sentColors && (
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700, padding: "4px 10px", borderRadius: 12,
                        background: sentColors.bg, color: sentColors.fg, textTransform: "uppercase", letterSpacing: 0.5,
                      }}>
                        {call.sentiment}
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#374151", fontSize: "0.88rem", lineHeight: 1.55, marginLeft: 48 }}>
                    {call.summary || <em style={{ color: "#9CA3AF" }}>Summary processing...</em>}
                  </div>
                  {selectedCall?.id === call.id && call.action_items && (
                    <div style={{ marginLeft: 48, marginTop: 12, padding: 12, background: "#F6FEFA", borderRadius: 8, border: "1px solid #D1FAE5" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#059669", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
                        Action Items
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#374151", whiteSpace: "pre-wrap" }}>
                        {call.action_items}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ background: "#F6FEFA", border: "1px dashed #D1FAE5", borderRadius: 12, padding: "1rem 1.25rem", fontSize: "0.82rem", color: "#6B7280", textAlign: "center" }}>
        🔒 For caller privacy, full transcripts are only visible to you in the Calls tab — never streamed publicly. This dashboard shows post-call summaries only.
      </div>
    </div>
  );
}
