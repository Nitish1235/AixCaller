import Link from "next/link";
import { fetchCalls, fetchAgents } from "@/lib/api";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", 
  border: "1.5px solid var(--border)", 
  borderRadius: 16,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)", 
  ...extra,
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const h = await headers();
  const tenantId = h.get("x-user-tenant-id") || "00000000-0000-0000-0000-000000000000";

  // Fetch data
  const [calls, agents] = await Promise.all([
    fetchCalls(tenantId),
    fetchAgents(tenantId).catch(() => []),
  ]);

  const totalCalls  = calls.length;
  const avgDuration = totalCalls > 0 ? "1m 24s" : "—";
  const leadsGen    = totalCalls > 0 ? Math.round(totalCalls * 0.3) : 0;
  const positiveRate= totalCalls > 0 ? `${Math.round(calls.filter((c:any) => c.sentiment === "positive").length / totalCalls * 100)}%` : "—";

  const stats = [
    { label: "Total Calls",   value: totalCalls,   sub: "All time",        icon: "📞", color: "var(--blue)" },
    { label: "Avg Duration",  value: avgDuration,   sub: "Per session",     icon: "⏱️", color: "var(--green)" },
    { label: "Leads",         value: leadsGen,      sub: "Qualified leads", icon: "🎯", color: "#8B5CF6" },
    { label: "Sentiment",     value: positiveRate,  sub: "Positive rate",   icon: "😊", color: "#F59E0B" },
  ];

  // Checklist completion
  const hasAgent = agents.length > 0;
  const hasPhone = agents.some((a: any) => a.phone_number || a.legacy_number);
  const hasCalls = totalCalls > 0;
  const showChecklist = !hasAgent || !hasPhone || !hasCalls;

  const sentimentColor = (s: string) => ({ positive: "var(--green)", neutral: "var(--text-muted)", negative: "#ef4444" }[s?.toLowerCase()] ?? "var(--text-muted)");
  const sentimentBg    = (s: string) => ({ positive: "var(--green-light)", neutral: "var(--surface)", negative: "#fef2f2" }[s?.toLowerCase()] ?? "var(--surface)");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(1.3rem, 4vw, 1.6rem)", color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>
            {getGreeting()} 👋
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Here&apos;s how your AI agents are performing today.
          </p>
        </div>
        <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
          <button style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)", whiteSpace: "nowrap" }}>
            + Create Agent
          </button>
        </Link>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid-responsive-4">
        {stats.map(s => (
          <div key={s.label} style={card({ padding: "1.25rem", borderLeft: `4px solid ${s.color}` })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{s.icon}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "clamp(1.4rem, 3vw, 1.8rem)", color: "var(--text)", letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Getting Started Checklist (only for new users) ── */}
      {showChecklist && (
        <div style={card({ padding: "1.5rem" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🚀</div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: 0 }}>Getting Started</h2>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.78rem" }}>Complete these steps to go live with your AI agent.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { done: hasAgent, label: "Create your first AI agent", href: "/dashboard/agents/create", actionLabel: "Create Agent" },
              { done: hasPhone, label: "Connect a phone number", href: hasAgent ? `/dashboard/agents/${agents[0]?.id}` : "/dashboard/agents/create", actionLabel: "Connect" },
              { done: hasCalls, label: "Receive your first call", href: "/dashboard/live", actionLabel: "Monitor" },
              { done: false, label: "Launch an outbound campaign", href: "/dashboard/campaigns", actionLabel: "Coming Soon", comingSoon: true },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderRadius: 12, border: "1.5px solid var(--border)",
                background: item.done ? "var(--green-light)" : "#fff",
                opacity: item.comingSoon ? 0.6 : 1,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: item.done ? "var(--green)" : "var(--surface)",
                  border: item.done ? "none" : "2px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", color: "#fff", fontWeight: 800,
                }}>
                  {item.done ? "✓" : i + 1}
                </div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: "0.88rem", color: item.done ? "var(--green)" : "var(--text)", textDecoration: item.done ? "line-through" : "none" }}>
                  {item.label}
                </span>
                {!item.done && (
                  <Link href={item.href} style={{ textDecoration: "none" }}>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700, color: item.comingSoon ? "var(--text-muted)" : "var(--blue)",
                      padding: "4px 12px", borderRadius: 8,
                      background: item.comingSoon ? "var(--surface)" : "var(--blue-light)",
                      border: `1px solid ${item.comingSoon ? "var(--border)" : "rgba(29,78,216,0.15)"}`,
                    }}>
                      {item.actionLabel}
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two Column: Quick Actions + Recent Activity ── */}
      <div className="grid-responsive-2">

        {/* Quick Actions — 3 essential items */}
        <div style={card({ padding: "1.5rem" })}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: "0 0 1rem" }}>Quick Actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: "Create a new AI agent", href: "/dashboard/agents/create", icon: "🤖", desc: "Deploy in under 5 min", color: "var(--blue)" },
              { label: "Upload knowledge base", href: "/dashboard/knowledge", icon: "📚", desc: "PDFs, URLs, or text", color: "var(--green)" },
              { label: "Outbound Campaign", href: "/dashboard/campaigns", icon: "📣", desc: "Dial leads automatically", color: "#8B5CF6", comingSoon: true },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                <div className="dashboard-action-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", background: "#ffffff", transition: "var(--transition)", cursor: "pointer" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${a.color}10`, border: `1.5px solid ${a.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>{a.label}</span>
                      {a.comingSoon && (
                        <span style={{ fontSize: "0.6rem", padding: "2px 6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5 }}>SOON</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{a.desc}</div>
                  </div>
                  <span style={{ color: a.color, fontWeight: 700, flexShrink: 0 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Agent Summary */}
        <div style={card({ padding: "1.5rem" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: 0 }}>Your Agents</h2>
            <Link href="/dashboard/agents" style={{ fontSize: "0.8rem", color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>View all →</Link>
          </div>

          {agents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🤖</div>
              <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4, fontSize: "0.92rem" }}>No agents yet</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>Create your first AI voice agent to get started.</div>
              <Link href="/dashboard/agents/create">
                <button style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 9, padding: "8px 20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)" }}>Create Agent</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {agents.slice(0, 4).map((agent: any) => (
                <Link key={agent.id} href={`/dashboard/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "#fff", transition: "var(--transition)", cursor: "pointer" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🤖</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{agent.phone_number || agent.legacy_number || "No phone connected"}</div>
                    </div>
                    <span style={{ background: "var(--green-light)", color: "var(--green)", borderRadius: 999, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 700 }}>● Active</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Calls Table ── */}
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
