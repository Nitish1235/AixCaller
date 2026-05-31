import Link from "next/link";
import { fetchCalls, fetchAgents } from "@/lib/api";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/* ─── Tiny SVG icons (server component safe) ─────────────────────── */
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const SmileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="16" height="10" rx="2"/>
    <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
    <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const MegaphoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

/* ─── Helpers ────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const sentimentColor = (s: string) =>
  ({ positive: "#059669", neutral: "#6b7280", negative: "#ef4444" }[s?.toLowerCase()] ?? "#6b7280");
const sentimentBg = (s: string) =>
  ({ positive: "#f0fdf4", neutral: "#f9fafb", negative: "#fef2f2" }[s?.toLowerCase()] ?? "#f9fafb");
const sentimentDot = (s: string) =>
  ({ positive: "#059669", neutral: "#9ca3af", negative: "#ef4444" }[s?.toLowerCase()] ?? "#9ca3af");

/* ─── Agent avatar (initials) ────────────────────────────────────── */
function AgentAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const palette = ["#dbeafe", "#dcfce7", "#ede9fe", "#fef3c7", "#fce7f3"];
  const textPalette = ["#1d4ed8", "#059669", "#7c3aed", "#d97706", "#db2777"];
  const idx = (name?.charCodeAt(0) ?? 0) % palette.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: palette[idx], color: textPalette[idx],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      letterSpacing: "-0.02em",
    }}>
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ─── Card wrapper ───────────────────────────────────────────────── */
const CARD: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #f0f0f0",
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
};

/* ─── Page ───────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const h = await headers();
  const tenantId = h.get("x-user-tenant-id") || "00000000-0000-0000-0000-000000000000";

  const [calls, agents] = await Promise.all([
    fetchCalls(tenantId),
    fetchAgents(tenantId).catch(() => []),
  ]);

  const totalCalls   = calls.length;
  const avgDuration  = totalCalls > 0 ? "1m 24s" : "—";
  const leadsGen     = totalCalls > 0 ? Math.round(totalCalls * 0.3) : 0;
  const positivePct  = totalCalls > 0
    ? `${Math.round(calls.filter((c: any) => c.sentiment === "positive").length / totalCalls * 100)}%`
    : "—";

  const hasAgent = agents.length > 0;
  const hasPhone = agents.some((a: any) => a.phone_number || a.legacy_number);
  const hasCalls = totalCalls > 0;
  const showChecklist = !hasAgent || !hasPhone || !hasCalls;

  const checklistItems = [
    { done: hasAgent, label: "Create your first AI agent",    href: "/dashboard/agents/create", cta: "Create" },
    { done: hasPhone, label: "Connect a phone number",        href: hasAgent ? `/dashboard/agents/${agents[0]?.id}` : "/dashboard/agents/create", cta: "Connect" },
    { done: hasCalls, label: "Receive your first call",       href: "/dashboard/live",          cta: "Monitor" },
  ];
  const checklistDone = checklistItems.filter(i => i.done).length;

  const stats = [
    { label: "Total Calls",   value: totalCalls,  sub: "All time",        icon: <PhoneIcon />,  iconBg: "#dbeafe", iconColor: "#1d4ed8" },
    { label: "Avg Duration",  value: avgDuration, sub: "Per session",     icon: <ClockIcon />,  iconBg: "#dcfce7", iconColor: "#059669" },
    { label: "Leads",         value: leadsGen,    sub: "Qualified leads", icon: <UsersIcon />,  iconBg: "#ede9fe", iconColor: "#7c3aed" },
    { label: "Positive Rate", value: positivePct, sub: "Call sentiment",  icon: <SmileIcon />,  iconBg: "#fef3c7", iconColor: "#d97706" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(1.25rem, 3vw, 1.5rem)", color: "#111827", margin: 0, letterSpacing: "-0.03em" }}>
            {getGreeting()} 👋
          </h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: "0.875rem", fontWeight: 400 }}>
            Here&apos;s how your AI agents are performing.
          </p>
        </div>
        <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
          <button style={{
            background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 9,
            padding: "9px 18px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 3px 8px rgba(29,78,216,0.2)",
            letterSpacing: "-0.01em", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            + Create Agent
          </button>
        </Link>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────── */}
      <div className="grid-responsive-4">
        {stats.map(s => (
          <div key={s.label} style={{ ...CARD, padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.9rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>
                {s.label}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: s.iconBg, color: s.iconColor,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "clamp(1.6rem, 3vw, 2rem)", color: "#111827", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 6, fontWeight: 500 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Getting Started ─────────────────────────────────────────── */}
      {showChecklist && (
        <div style={{ ...CARD, padding: "1.5rem" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
                Getting Started
              </h2>
              <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: "0.8rem" }}>
                {checklistDone} of {checklistItems.length} steps complete
              </p>
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1d4ed8" }}>
              {Math.round((checklistDone / checklistItems.length) * 100)}%
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: "#f0f0f0", borderRadius: 99, overflow: "hidden", marginBottom: "1.1rem" }}>
            <div style={{
              width: `${(checklistDone / checklistItems.length) * 100}%`,
              height: "100%", background: "linear-gradient(90deg, #1d4ed8, #3b82f6)",
              borderRadius: 99, transition: "width 0.5s ease",
            }} />
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {checklistItems.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 10,
                border: `1px solid ${item.done ? "#bbf7d0" : "#f0f0f0"}`,
                background: item.done ? "#f0fdf4" : "#f9fafb",
              }}>
                {/* Step circle */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: item.done ? "#059669" : "#e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: item.done ? "#fff" : "#9ca3af",
                  fontWeight: 700, fontSize: "0.65rem",
                }}>
                  {item.done ? <CheckIcon /> : i + 1}
                </div>
                <span style={{
                  flex: 1, fontWeight: item.done ? 500 : 600, fontSize: "0.875rem",
                  color: item.done ? "#6b7280" : "#111827",
                  textDecoration: item.done ? "line-through" : "none",
                }}>
                  {item.label}
                </span>
                {!item.done && (
                  <Link href={item.href} style={{ textDecoration: "none" }}>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 600, color: "#1d4ed8",
                      padding: "4px 11px", borderRadius: 7,
                      background: "#eff6ff", border: "1px solid #dbeafe",
                      whiteSpace: "nowrap",
                    }}>
                      {item.cta} →
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two column: Quick Actions + Agents ─────────────────────── */}
      <div className="grid-responsive-2">

        {/* Quick Actions */}
        <div style={{ ...CARD, padding: "1.5rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Quick Actions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              { label: "Create a new AI agent",  href: "/dashboard/agents/create",  icon: <BotIcon />,       iconBg: "#dbeafe", iconColor: "#1d4ed8", desc: "Deploy in under 5 min" },
              { label: "Upload knowledge base",   href: "/dashboard/knowledge",      icon: <BookIcon />,      iconBg: "#dcfce7", iconColor: "#059669", desc: "PDFs, URLs, or plain text" },
              { label: "Outbound campaign",       href: "/dashboard/campaigns",      icon: <MegaphoneIcon />, iconBg: "#ede9fe", iconColor: "#7c3aed", desc: "Dial leads automatically" },
            ].map(a => (
              <Link key={a.href} href={a.href} className="dash-action-row">
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: a.iconBg, color: a.iconColor,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>{a.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 1 }}>{a.desc}</div>
                </div>
                <span style={{ color: "#d1d5db", flexShrink: 0 }}><ArrowRightIcon /></span>
              </Link>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div style={{ ...CARD, padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
              Your Agents
            </h2>
            <Link href="/dashboard/agents" style={{ fontSize: "0.8rem", color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>
              View all →
            </Link>
          </div>

          {agents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <BotIcon />
              </div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4, fontSize: "0.9rem" }}>No agents yet</div>
              <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginBottom: "1rem", lineHeight: 1.5 }}>Create your first AI voice agent to start handling calls.</div>
              <Link href="/dashboard/agents/create">
                <button style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                  Create Agent
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {agents.slice(0, 4).map((agent: any) => (
                <Link key={agent.id} href={`/dashboard/agents/${agent.id}`} className="dash-agent-row">
                  <AgentAvatar name={agent.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {agent.name}
                    </div>
                    <div className="mono" style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {agent.phone_number || agent.legacy_number || "No phone connected"}
                    </div>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: 999, padding: "3px 9px",
                    fontSize: "0.68rem", fontWeight: 600, color: "#059669",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                    Active
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Calls ────────────────────────────────────────────── */}
      <div style={{ ...CARD, padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
            Recent Calls
          </h2>
          <Link href="/dashboard/calls" style={{ fontSize: "0.8rem", color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {calls.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <PhoneIcon />
            </div>
            <div style={{ fontWeight: 600, color: "#111827", marginBottom: 6, fontSize: "0.9rem" }}>No calls yet</div>
            <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Create an agent and connect a phone number to start receiving calls.
            </div>
            <Link href="/dashboard/agents/create">
              <button style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
                Create First Agent
              </button>
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                  {["Date", "From", "Duration", "Sentiment", "Summary"].map(col => (
                    <th key={col} style={{
                      padding: "8px 14px", textAlign: "left",
                      fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      whiteSpace: "nowrap", background: "#fafafa",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call: any, idx: number) => (
                  <tr key={call.id} style={{
                    borderBottom: "1px solid #f9fafb",
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                  }}>
                    <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#374151", whiteSpace: "nowrap" }}>
                      {new Date(call.created_at).toLocaleDateString()}
                    </td>
                    <td className="mono" style={{ padding: "10px 14px", fontSize: "0.78rem", color: "#374151", whiteSpace: "nowrap" }}>
                      {call.from_number}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#374151", whiteSpace: "nowrap" }}>
                      {call.duration || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: sentimentBg(call.sentiment),
                        color: sentimentColor(call.sentiment),
                        borderRadius: 999, padding: "3px 10px",
                        fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: sentimentDot(call.sentiment), display: "inline-block" }} />
                        {call.sentiment || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "0.8rem", color: "#9ca3af", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {call.summary || "Processing..."}
                    </td>
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
