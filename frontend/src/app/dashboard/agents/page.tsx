import { fetchAgents } from "@/lib/api";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)", ...extra,
});

export default async function AgentsPage() {
  const h = await headers();
  const tenantId = h.get("x-user-tenant-id") || "00000000-0000-0000-0000-000000000000";
  const agents = await fetchAgents(tenantId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>Agent Command Center</h1>
          <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>Manage your AI workforce, edit prompts, and configure phone numbers.</p>
        </div>
        <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
          <button style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(6,78,59,0.3)" }}>
            + Create New Agent
          </button>
        </Link>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          { label: "Total Agents", value: agents.length, icon: "🤖" },
          { label: "Active Now",   value: agents.filter((a: any) => a.status !== "inactive").length, icon: "🟢" },
          { label: "Calls Today",  value: 0, icon: "📞" },
        ].map(s => (
          <div key={s.label} style={card({ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: 14 })}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "#064E3B", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#9CA3AF", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Agents grid */}
      {agents.length === 0 ? (
        <div style={card({ padding: "5rem 2rem", textAlign: "center" })}>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🤖</div>
          <h2 style={{ fontWeight: 800, color: "#064E3B", marginBottom: 8 }}>No agents yet</h2>
          <p style={{ color: "#9CA3AF", marginBottom: "2rem", maxWidth: 360, margin: "0 auto 2rem" }}>
            Create your first AI voice agent. It'll be trained and live on your phone line in under 5 minutes.
          </p>
          <Link href="/dashboard/agents/create">
            <button style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}>
              Create Your First Agent →
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {agents.map((agent: any) => (
            <div key={agent.id} style={card({ padding: "1.75rem", borderLeft: "4px solid #10B981" })}>
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #064E3B, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>🤖</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B" }}>{agent.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>ID: {agent.id?.slice(0, 8)}...</div>
                  </div>
                </div>
                <span style={{ background: "#ECFDF5", color: "#059669", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #D1FAE5" }}>
                  ● Active
                </span>
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
                {[
                  ["📞 Phone", agent.phone_number || "Not connected"],
                  ["🎙️ Voice",  agent.voice_id || "aura-asteria-en"],
                  ["🔧 Tools",  `${agent.tools_config ? Object.keys(agent.tools_config).length : 0} configured`],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#9CA3AF", fontWeight: 500 }}>{label}</span>
                    <span style={{ color: "#374151", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <Link href={`/dashboard/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                <button style={{ width: "100%", background: "#F6FEFA", color: "#064E3B", border: "1.5px solid #D1FAE5", borderRadius: 9, padding: "9px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
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
