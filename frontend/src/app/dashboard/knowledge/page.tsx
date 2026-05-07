"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAgents, API_BASE_URL } from "@/lib/api";

const getTenantId = () => {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  let tid = match ? decodeURIComponent(match[1]) : null;
  if (tid) { localStorage.setItem("tenant_id", tid); return tid; }
  return localStorage.getItem("tenant_id") || "00000000-0000-0000-0000-000000000000";
};

export default function KnowledgePage() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kbStats, setKbStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const tid = getTenantId();
    fetchAgents(tid).then(async (list: any[]) => {
      setAgents(list);
      // Load KB stats for each agent
      const stats: Record<string, number> = {};
      await Promise.all(list.map(async (a: any) => {
        try {
          const res = await fetch(`${API_BASE_URL}/kb/chunks?agent_id=${a.id}`);
          const data = await res.json();
          stats[a.id] = data.total_chunks || 0;
        } catch { stats[a.id] = 0; }
      }));
      setKbStats(stats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const card: React.CSSProperties = {
    background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
    boxShadow: "0 2px 12px rgba(16,185,129,0.07)", padding: "1.75rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0 }}>Knowledge Base</h1>
        <p style={{ color: "#9CA3AF", marginTop: 4, fontSize: "0.88rem" }}>
          Train each agent with your business data — FAQs, docs, website content.
        </p>
      </div>

      {/* How it works banner */}
      <div style={{ ...card, background: "linear-gradient(135deg,#064E3B,#059669)", color: "#fff", display: "flex", gap: "2rem", alignItems: "center" }}>
        {[
          ["📝", "Add Content", "Paste text, upload .txt/.md files, or sync a website URL"],
          ["🔍", "Semantic Search", "Queries are matched by meaning — not just keywords"],
          ["🤖", "Auto Injection", "Relevant chunks are injected into the AI context on each call"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.8, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Agent list */}
      <div style={card}>
        <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: "1.25rem" }}>Select an Agent to Manage its Knowledge Base</h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>Loading agents...</div>
        ) : agents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
            <p style={{ color: "#9CA3AF" }}>No agents yet. <a href="/dashboard/agents/create" style={{ color: "#059669", fontWeight: 700 }}>Create one first.</a></p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {agents.map((a: any) => {
              const chunks = kbStats[a.id] ?? "...";
              return (
                <div key={a.id}
                  onClick={() => router.push(`/dashboard/agents/${a.id}?tab=kb`)}
                  style={{ border: "1.5px solid #D1FAE5", borderRadius: 12, padding: "1.25rem", cursor: "pointer", background: "#F6FEFA", transition: "all 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#059669")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#D1FAE5")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B" }}>{a.name}</div>
                    <span style={{
                      background: chunks > 0 ? "#ECFDF5" : "#F3F4F6",
                      color: chunks > 0 ? "#059669" : "#9CA3AF",
                      border: `1px solid ${chunks > 0 ? "#D1FAE5" : "#E5E7EB"}`,
                      borderRadius: 99, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700
                    }}>
                      {chunks} chunks
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 14, lineHeight: 1.5 }}>
                    {a.system_prompt?.slice(0, 80)}...
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 700 }}>
                    📚 Manage Knowledge Base →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
