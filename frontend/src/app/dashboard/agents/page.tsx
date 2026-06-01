import { fetchAgents } from "@/lib/api";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)", ...extra,
});

export default async function AgentsPage() {
  const h = await headers();
  // Aggressive lookup: check multiple cookie names and headers
  const cookieHeader = h.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|; )tenant_id=([^;]*)/);
  const tenantId = match
    ? decodeURIComponent(match[1])
    : (h.get("x-user-tenant-id") || "00000000-0000-0000-0000-000000000000");

  console.log(`[Dashboard] Listing agents for tenant: ${tenantId}`);

  const agents = await fetchAgents(tenantId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(1.3rem,4vw,1.6rem)", color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>Agent Command Center</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>Manage your AI workforce, edit prompts, and configure phone numbers.</p>
        </div>
        <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
          <button style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)", whiteSpace: "nowrap" }}>
            + Create Agent
          </button>
        </Link>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Total Agents", value: agents.length, icon: "🤖" },
          { label: "Active Now", value: agents.filter((a: any) => a.status !== "inactive").length, icon: "🟢" },
          { label: "Calls Today", value: 0, icon: "📞" },
        ].map(s => (
          <div key={s.label} style={card({ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: 14 })}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--text)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Agents grid */}
      {agents.length === 0 ? (
        <div style={card({ padding: "5rem 2rem", textAlign: "center" })}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--blue-light)", border: "1.5px solid rgba(29,78,216,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="8" width="16" height="10" rx="2"/>
              <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
              <circle cx="9" cy="13" r="1" fill="var(--blue)" stroke="none"/>
              <circle cx="15" cy="13" r="1" fill="var(--blue)" stroke="none"/>
              <path d="M4 13H2m20 0h-2"/>
            </svg>
          </div>
          <h2 style={{ fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>No agents yet</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem", maxWidth: 360, margin: "0 auto 2rem" }}>
            Create your first AI voice agent. It'll be trained and live on your phone line in under 5 minutes.
          </p>
          <Link href="/dashboard/agents/create">
            <button style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)" }}>
              Create Your First Agent →
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {agents.map((agent: any) => (
            <div key={agent.id} style={card({ padding: "1.75rem", borderLeft: "4px solid var(--blue)" })}>
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blue-light)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="8" width="16" height="10" rx="2"/>
                      <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
                      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/>
                      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>
                      <path d="M4 13H2m20 0h-2"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)" }}>{agent.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {agent.id?.slice(0, 8)}...</div>
                  </div>
                </div>
                {agent.telnyx_assistant_id && agent.phone_number ? (
                  <span style={{ background: "var(--green-light)", color: "var(--green)", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid rgba(5,150,105,0.15)" }}>
                    ● Live
                  </span>
                ) : agent.phone_number ? (
                  <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #fde68a" }}>
                    ⚙ Syncing
                  </span>
                ) : (
                  <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #e2e8f0" }}>
                    ○ No number
                  </span>
                )}
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
                {[
                  ["Phone", agent.phone_number || "Not connected"],
                  ["Voice", (agent.voice_id || "Grace").split(".").pop()],
                  ["Tools", `${agent.tools_config ? Object.keys(agent.tools_config).length : 0} configured`],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <Link href={`/dashboard/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                <button style={{ width: "100%", background: "var(--blue-light)", color: "var(--blue)", border: "1.5px solid rgba(29,78,216,0.15)", borderRadius: 9, padding: "9px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                  Configure Agent →
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
