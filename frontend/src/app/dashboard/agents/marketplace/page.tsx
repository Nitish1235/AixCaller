"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Template {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: string;
  default_name: string;
  voice_id: string;
  starter_kb_topics: string[];
}

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff",
  border: "1.5px solid #D1FAE5",
  borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)",
  ...extra,
});

export default function MarketplacePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Template | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/agent-templates`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!selected || !businessName.trim()) {
      setError("Please enter your business name.");
      return;
    }
    const tenantId = localStorage.getItem("tenant_id");
    if (!tenantId) {
      setError("Not logged in.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/agents/from-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id:    selected.id,
          tenant_id:      tenantId,
          business_name:  businessName.trim(),
          agent_name:     agentName.trim() || selected.default_name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create agent");
      }
      const agent = await res.json();
      router.push(`/dashboard/agents/${agent.id}`);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>
            Agent Marketplace
          </h1>
          <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Pre-built AI agents for your industry. Customize in seconds.
          </p>
        </div>
        <Link href="/dashboard/agents">
          <button style={{ background: "#fff", border: "1.5px solid #D1FAE5", color: "#064E3B", borderRadius: 10, padding: "10px 18px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
            ← Back to My Agents
          </button>
        </Link>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Loading templates...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {templates.map(t => (
            <div
              key={t.id}
              onClick={() => { setSelected(t); setAgentName(t.default_name); setError(null); }}
              style={card({
                padding: "1.75rem 1.5rem",
                cursor: "pointer",
                border: selected?.id === t.id ? "2px solid #10B981" : "1.5px solid #D1FAE5",
                transition: "all 0.15s",
                transform: selected?.id === t.id ? "translateY(-2px)" : "none",
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                  {t.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#064E3B", fontSize: "1rem" }}>{t.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
                    {t.category}
                  </div>
                </div>
              </div>
              <p style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.55, margin: "0 0 1rem" }}>
                {t.description}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {t.starter_kb_topics.slice(0, 3).map(topic => (
                  <span key={topic} style={{ fontSize: "0.72rem", padding: "3px 8px", background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 6, color: "#059669", fontWeight: 600 }}>
                    {topic}
                  </span>
                ))}
                {t.starter_kb_topics.length > 3 && (
                  <span style={{ fontSize: "0.72rem", color: "#9CA3AF", fontWeight: 600, alignSelf: "center" }}>
                    +{t.starter_kb_topics.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup panel (shown after template selected) */}
      {selected && (
        <div style={card({ padding: "2rem", marginTop: 12 })}>
          <h2 style={{ fontWeight: 800, fontSize: "1.05rem", color: "#064E3B", marginBottom: 6 }}>
            Customize Your {selected.title}
          </h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Just tell us your business name. Everything else is pre-configured.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9CA3AF", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Business Name *
              </label>
              <input
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. NovaEdge Solutions"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #D1FAE5", borderRadius: 9, fontSize: "0.9rem", color: "#064E3B", fontWeight: 600, outline: "none" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9CA3AF", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Agent's Name
              </label>
              <input
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder={selected.default_name}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #D1FAE5", borderRadius: 9, fontSize: "0.9rem", color: "#064E3B", fontWeight: 600, outline: "none" }}
              />
            </div>
          </div>

          <div style={{ padding: "1rem", background: "#F6FEFA", borderRadius: 10, border: "1px dashed #D1FAE5", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#059669", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              💡 Greeting Preview
            </div>
            <div style={{ fontSize: "0.9rem", color: "#064E3B", fontStyle: "italic" }}>
              "Hi, thanks for calling {businessName || "[your business]"}. This is {agentName || selected.default_name} — how can I help you today?"
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !businessName.trim()}
            style={{
              background: creating ? "#9CA3AF" : "linear-gradient(135deg, #10B981, #064E3B)",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 28px", fontWeight: 700, fontSize: "0.95rem",
              cursor: creating ? "default" : "pointer",
              opacity: businessName.trim() ? 1 : 0.5,
            }}
          >
            {creating ? "Creating..." : "Create This Agent →"}
          </button>
        </div>
      )}
    </div>
  );
}
