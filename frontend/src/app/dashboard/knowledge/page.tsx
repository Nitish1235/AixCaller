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
    background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16,
    boxShadow: "0 4px 15px rgba(0,0,0,0.02)", padding: "1.75rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "var(--text)", margin: 0 }}>Knowledge Base</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: "0.88rem" }}>
          Train each agent with your business data — FAQs, services, pricing, policies.
        </p>
      </div>

      {/* How it works banner */}
      <div style={{ ...card, background: "linear-gradient(135deg, var(--blue), #3b82f6)", color: "#fff", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center", border: "none" }}>
        {[
          ["📝", "Add Content", "Paste text or upload .txt / .md files (website sync coming soon)"],
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
        <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: "1.25rem" }}>Select an Agent to Manage its Knowledge Base</h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Loading agents...</div>
        ) : agents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
            <p style={{ color: "var(--text-muted)" }}>No agents yet. <a href="/dashboard/agents/create" style={{ color: "var(--blue)", fontWeight: 700 }}>Create one first.</a></p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {agents.map((a: any) => {
              const chunks = kbStats[a.id] ?? "...";
              const hasChunks = chunks > 0;
              return (
                <div key={a.id}
                  onClick={() => router.push(`/dashboard/agents/${a.id}?tab=kb`)}
                  style={{ border: "1.5px solid var(--border)", borderRadius: 12, padding: "1.25rem", cursor: "pointer", background: "#ffffff", transition: "all 0.15s" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--blue)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(29, 78, 216, 0.04)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)" }}>{a.name}</div>
                    <span style={{
                      background: hasChunks ? "var(--blue-light)" : "#F3F4F6",
                      color: hasChunks ? "var(--blue)" : "var(--text-muted)",
                      border: `1px solid ${hasChunks ? "rgba(29, 78, 216, 0.15)" : "#E5E7EB"}`,
                      borderRadius: 99, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700
                    }}>
                      {chunks} chunks
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                    {a.system_prompt?.slice(0, 80)}...
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--blue)", fontWeight: 700 }}>
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
