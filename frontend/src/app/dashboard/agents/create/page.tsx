"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TENANT_ID = "00000000-0000-0000-0000-000000000000";
const API_URL   = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
  transition: "border-color 0.2s",
};
const card: React.CSSProperties = {
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 4px 20px rgba(16,185,129,0.08)", padding: "2.5rem",
  maxWidth: 620, margin: "0 auto",
};
const label: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.82rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5,
};
const btn: React.CSSProperties = {
  width: "100%", background: "#064E3B", color: "#fff", border: "none",
  borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: "0.95rem",
  cursor: "pointer", boxShadow: "0 4px 14px rgba(6,78,59,0.3)", transition: "all 0.2s",
};

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName]   = useState("");
  const [prompt, setPrompt] = useState("You are a helpful AI assistant for our business. Be warm, concise, and professional.");
  const [areaCode, setAreaCode] = useState("");
  const [numbers, setNumbers]   = useState<string[]>([]);
  const [agentId, setAgentId]   = useState<string | null>(null);

  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, system_prompt: prompt, tenant_id: TENANT_ID, voice_id: "aura-asteria-en" }),
      });
      if (!res.ok) throw new Error("Failed to create agent");
      const agent = await res.json();
      setAgentId(agent.id); setStep(2);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const searchNumbers = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/numbers/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area_code: areaCode, limit: 5 }),
      });
      if (!res.ok) throw new Error("Failed to search numbers");
      const data = await res.json(); setNumbers(data.numbers || []);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const claimNumber = async (phone: string) => {
    if (!agentId) return; setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/numbers/purchase`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone, tenant_id: TENANT_ID, agent_id: agentId }),
      });
      if (!res.ok) throw new Error("Failed to claim number");
      router.push(`/dashboard/agents/${agentId}`);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <button onClick={() => router.push("/dashboard/agents")} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, padding: 0, marginBottom: 12 }}>← Back to Agents</button>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>Create New Agent</h1>
        <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>Deploy your AI workforce member in under 5 minutes.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 620, margin: "0 auto", width: "100%" }}>
        {[["1", "Agent Setup"], ["2", "Phone Number"]].map(([n, l], i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: step >= Number(n) ? "#064E3B" : "#E5E7EB", color: step >= Number(n) ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>{n}</div>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: step >= Number(n) ? "#064E3B" : "#9CA3AF" }}>{l}</span>
            </div>
            {i === 0 && <div style={{ flex: 1, height: 2, background: step >= 2 ? "#10B981" : "#E5E7EB", margin: "0 12px" }} />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 10, padding: "12px 16px", fontSize: "0.88rem", maxWidth: 620, margin: "0 auto", width: "100%" }}>{error}</div>}

      {/* Step 1 */}
      {step === 1 && (
        <div style={card}>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#064E3B", marginBottom: "0.5rem" }}>Agent Details</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "2rem" }}>Give your agent a name and define how it should behave on calls.</p>
          <form onSubmit={createAgent} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={label}>Agent Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah — Sales Representative" required style={inp} />
            </div>
            <div>
              <label style={label}>System Prompt & Instructions *</label>
              <textarea rows={7} value={prompt} onChange={e => setPrompt(e.target.value)} required
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
              <p style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: 6 }}>Describe your business, products, and how Aria should handle calls.</p>
            </div>
            <div>
              <label style={label}>Voice</label>
              <select style={{ ...inp }} defaultValue="aura-asteria-en">
                <option value="aura-asteria-en">Aria — Female, American English</option>
                <option value="aura-orion-en">Orion — Male, American English</option>
                <option value="aura-luna-en">Luna — Female, Soft</option>
              </select>
            </div>
            <button type="submit" disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating agent..." : "Next: Setup Phone Number →"}
            </button>
          </form>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={card}>
          <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 16px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✅</span><span style={{ fontWeight: 700, color: "#059669", fontSize: "0.88rem" }}>Agent created successfully! Now let's connect a phone number.</span>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#064E3B", marginBottom: "0.5rem" }}>Setup Phone Number</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "2rem" }}>Search by area code to get a local number for your AI agent.</p>

          <form onSubmit={searchNumbers} style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
            <input type="text" value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="Area code, e.g. 212" maxLength={3}
              required style={{ ...inp, flex: 1 }} />
            <button type="submit" disabled={loading}
              style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {numbers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <label style={label}>Available Numbers</label>
              {numbers.map(num => (
                <div key={num} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F6FEFA", border: "1.5px solid #D1FAE5", borderRadius: 10 }}>
                  <span style={{ fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 700, color: "#064E3B", letterSpacing: 1 }}>{num}</span>
                  <button onClick={() => claimNumber(num)} disabled={loading}
                    style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
                    {loading ? "..." : "Claim"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => router.push(`/dashboard/agents/${agentId}`)}
            style={{ background: "none", border: "1.5px solid #E5E7EB", borderRadius: 9, padding: "11px", width: "100%", color: "#9CA3AF", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" }}>
            Skip for now — configure later
          </button>
        </div>
      )}
    </div>
  );
}
