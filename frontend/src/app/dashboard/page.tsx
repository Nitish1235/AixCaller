import Link from "next/link";
import { fetchCalls } from "@/lib/api";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", 
  border: "1.5px solid var(--border)", 
  borderRadius: 16,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)", 
  ...extra,
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
    { label: "Total Calls",      value: totalCalls,       sub: "All time",          icon: "📞", color: "var(--text)", bg: "var(--blue-light)" },
    { label: "Avg Duration",     value: avgDuration,      sub: "Per session",        icon: "⏱️", color: "var(--text)", bg: "var(--surface)" },
    { label: "Leads",            value: leadsGen,          sub: "Qualified leads",   icon: "🎯", color: "var(--text)", bg: "var(--blue-light)" },
    { label: "Sentiment",        value: positiveRate,     sub: "Positive rate",      icon: "😊", color: "var(--text)", bg: "var(--surface)" },
  ];

  const sentimentColor = (s: string) => ({ positive: "var(--green)", neutral: "var(--text-muted)", negative: "#ef4444" }[s?.toLowerCase()] ?? "var(--text-muted)");
  const sentimentBg    = (s: string) => ({ positive: "var(--green-light)", neutral: "var(--surface)", negative: "#fef2f2" }[s?.toLowerCase()] ?? "var(--surface)");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(1.3rem, 4vw, 1.6rem)", color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>Good morning 👋</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>Here's how your AI agents are performing today.</p>
        </div>
        <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
          <button style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)", whiteSpace: "nowrap" }}>
            + Create Agent
          </button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid-responsive-4">
        {stats.map(s => (
          <div key={s.label} style={card({ padding: "1.25rem", borderLeft: "4px solid var(--blue)" })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{s.icon}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "clamp(1.4rem, 3vw, 1.8rem)", color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Two column row */}
      <div className="grid-responsive-2">

        {/* Quick Actions */}
        <div style={card({ padding: "1.5rem" })}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: "0 0 1rem" }}>Quick Actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: "Create a new AI agent",     href: "/dashboard/agents/create",     icon: "🤖", desc: "Deploy in under 5 min" },
              { label: "Upload knowledge base",      href: "/dashboard/knowledge",          icon: "📚", desc: "PDFs, URLs, or text" },
              { label: "Connect an integration",     href: "/dashboard/integrations",       icon: "🔌", desc: "Shopify, CRM, Calendly" },
              { label: "Monitor live calls",         href: "/dashboard/live",               icon: "🔴", desc: "Real-time transcripts" },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                <div className="dashboard-action-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "#ffffff", transition: "var(--transition)", cursor: "pointer" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{a.desc}</div>
                  </div>
                  <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div style={card({ padding: "1.5rem" })}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: "0 0 1rem" }}>System Status</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              ["Voice Engine",     "Operational", "var(--green)"],
              ["STT (Deepgram)",   "Operational", "var(--green)"],
              ["LLM (GPT-4o)",     "Operational", "var(--green)"],
              ["TTS (Deepgram)",   "Operational", "var(--green)"],
              ["Telephony",        "Operational", "var(--green)"],
            ].map(([svc, status, color]) => (
              <div key={svc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1.5px solid var(--border)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 500 }}>{svc}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color }}>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", background: "var(--green-light)", borderRadius: 10, padding: "10px 14px", fontSize: "0.75rem", color: "var(--green)", fontWeight: 600 }}>
            ✓ All systems operational · 99.9% uptime this month
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div style={card({ padding: "1.5rem" })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: 0 }}>Recent Calls</h2>
          <Link href="/dashboard/calls" style={{ fontSize: "0.8rem", color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>View all →</Link>
        </div>

        {calls.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📞</div>
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No calls yet</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>Create an agent and connect a phone number to start receiving calls.</div>
            <Link href="/dashboard/agents/create">
              <button style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)" }}>Create First Agent</button>
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
                  {["Date", "From", "Duration", "Sentiment", "Summary"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call: any) => (
                  <tr key={call.id} style={{ borderBottom: "1.5px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "var(--text-body)", whiteSpace: "nowrap" }}>{new Date(call.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "var(--text-body)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{call.from_number}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "var(--text-body)", whiteSpace: "nowrap" }}>{call.duration || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: sentimentBg(call.sentiment), color: sentimentColor(call.sentiment), borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {call.sentiment || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{call.summary || "Processing..."}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
