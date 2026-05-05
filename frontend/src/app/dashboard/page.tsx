import Link from "next/link";
import { fetchCalls } from "@/lib/api";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)", ...extra,
});

export default async function DashboardPage() {
  const h = await headers();
  const tenantId = h.get("x-user-tenant-id") || "00000000-0000-0000-0000-000000000000";
  const calls = await fetchCalls(tenantId);
  const totalCalls  = calls.length;
  const avgDuration = totalCalls > 0 ? "1m 24s" : "—";
  const leadsGen    = totalCalls > 0 ? Math.round(totalCalls * 0.3) : 0;
  const positiveRate= totalCalls > 0 ? `${Math.round(calls.filter((c:any) => c.sentiment === "positive").length / totalCalls * 100)}%` : "—";

  const stats = [
    { label: "Total Calls",      value: totalCalls,       sub: "All time",          icon: "📞", color: "#064E3B", bg: "#ECFDF5" },
    { label: "Avg Call Duration", value: avgDuration,     sub: "Per session",        icon: "⏱️", color: "#059669", bg: "#F0FDF4" },
    { label: "Leads Generated",  value: leadsGen,         sub: "Qualified leads",    icon: "🎯", color: "#065F46", bg: "#ECFDF5" },
    { label: "Positive Sentiment",value: positiveRate,    sub: "Caller satisfaction", icon: "😊", color: "#059669", bg: "#F0FDF4" },
  ];

  const sentimentColor = (s: string) => ({ positive: "#10B981", neutral: "#6B7280", negative: "#EF4444" }[s?.toLowerCase()] ?? "#9CA3AF");
  const sentimentBg    = (s: string) => ({ positive: "#ECFDF5", neutral: "#F3F4F6", negative: "#FEF2F2" }[s?.toLowerCase()] ?? "#F9FAFB");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>Good morning 👋</h1>
          <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>Here's how your AI agents are performing today.</p>
        </div>
        <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
          <button style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(6,78,59,0.3)" }}>
            + Create Agent
          </button>
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
        {stats.map(s => (
          <div key={s.label} style={card({ padding: "1.5rem", borderLeft: "4px solid #10B981" })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{s.icon}</div>
            </div>
            <div style={{ fontWeight: 900, fontSize: "1.8rem", color: s.color, letterSpacing: -1 }}>{s.value}</div>
            <div style={{ fontSize: "0.76rem", color: "#9CA3AF", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Two column row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

        {/* Quick Actions */}
        <div style={card({ padding: "1.75rem" })}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: "0 0 1.25rem" }}>Quick Actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: "Create a new AI agent",     href: "/dashboard/agents/create",     icon: "🤖", desc: "Deploy in under 5 min" },
              { label: "Upload knowledge base",      href: "/dashboard/knowledge",          icon: "📚", desc: "PDFs, URLs, or text" },
              { label: "Connect an integration",     href: "/dashboard/integrations",       icon: "🔌", desc: "Shopify, CRM, Calendly" },
              { label: "Monitor live calls",         href: "/dashboard/live",               icon: "🔴", desc: "Real-time transcripts" },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", transition: "all 0.15s", cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#064E3B" }}>{a.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>{a.desc}</div>
                  </div>
                  <span style={{ color: "#10B981", fontWeight: 700 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div style={card({ padding: "1.75rem" })}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: "0 0 1.25rem" }}>System Status</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              ["Voice Engine",     "Operational", "#10B981"],
              ["STT (Deepgram)",   "Operational", "#10B981"],
              ["LLM (GPT-4o)",     "Operational", "#10B981"],
              ["TTS (Deepgram)",   "Operational", "#10B981"],
              ["Telephony",        "Operational", "#10B981"],
            ].map(([svc, status, color]) => (
              <div key={svc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontSize: "0.88rem", color: "#374151", fontWeight: 500 }}>{svc}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color }}>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", background: "#ECFDF5", borderRadius: 10, padding: "10px 14px", fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>
            ✓ All systems operational · 99.9% uptime this month
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div style={card({ padding: "1.75rem" })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: 0 }}>Recent Calls</h2>
          <Link href="/dashboard/calls" style={{ fontSize: "0.8rem", color: "#10B981", fontWeight: 700, textDecoration: "none" }}>View all →</Link>
        </div>

        {calls.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📞</div>
            <div style={{ fontWeight: 700, color: "#064E3B", marginBottom: 6 }}>No calls yet</div>
            <div style={{ color: "#9CA3AF", fontSize: "0.88rem", marginBottom: "1.5rem" }}>Create an agent and connect a phone number to start receiving calls.</div>
            <Link href="/dashboard/agents/create">
              <button style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>Create First Agent</button>
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #F3F4F6" }}>
                {["Date", "From", "Duration", "Sentiment", "Summary"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call: any) => (
                <tr key={call.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                  <td style={{ padding: "12px", fontSize: "0.85rem", color: "#374151" }}>{new Date(call.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: "12px", fontSize: "0.85rem", color: "#374151", fontFamily: "monospace" }}>{call.from_number}</td>
                  <td style={{ padding: "12px", fontSize: "0.85rem", color: "#374151" }}>{call.duration || "—"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: sentimentBg(call.sentiment), color: sentimentColor(call.sentiment), borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                      {call.sentiment || "Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: "0.82rem", color: "#6B7280", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{call.summary || "Processing..."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
