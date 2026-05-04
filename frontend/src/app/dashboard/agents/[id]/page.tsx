"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL   = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TENANT_ID = "00000000-0000-0000-0000-000000000000";

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
};
const label: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5,
};
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)", padding: "1.75rem", ...extra,
});

export default function AgentDetailsPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [agent, setAgent]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [name, setName]     = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/v1/agents?tenant_id=${TENANT_ID}`);
        const list = await res.json();
        const found = list.find((a: any) => a.id === id);
        if (found) { setAgent(found); setName(found.name); setPrompt(found.system_prompt || ""); }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch_();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/v1/agents/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, system_prompt: prompt }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Loading agent details...</div>;
  if (!agent)  return <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Agent not found.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard/agents")} style={{ background: "#F6FEFA", border: "1.5px solid #D1FAE5", borderRadius: 9, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem", color: "#064E3B" }}>←</button>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: "1.5rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>{agent.name}</h1>
            <p style={{ color: "#9CA3AF", margin: "2px 0 0", fontSize: "0.85rem" }}>Configure behavior and telephony settings.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 700 }}>✓ Saved!</span>}
          <button onClick={save} disabled={saving}
            style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 999, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700, color: "#059669" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
          Active
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 999, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#6B7280" }}>
          ID: {String(id).slice(0, 8)}...
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Left: Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={card()}>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: "1.5rem" }}>Agent Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={label}>Agent Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={label}>System Prompt</label>
                <textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <p style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: 4 }}>How your agent should behave and what it knows about your business.</p>
              </div>
              <div>
                <label style={label}>Voice</label>
                <select style={inp} defaultValue={agent.voice_id || "aura-asteria-en"}>
                  <option value="aura-asteria-en">Aria — Female, American English</option>
                  <option value="aura-orion-en">Orion — Male, American English</option>
                  <option value="aura-luna-en">Luna — Female, Soft</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Telephony */}
        <div>
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: 0 }}>Incoming Calls</h2>
              {agent.phone_number ? (
                <span style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #D1FAE5", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>● Live</span>
              ) : (
                <span style={{ background: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>⚠ No Number</span>
              )}
            </div>

            {agent.phone_number ? (
              <>
                {/* Phone display */}
                <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 12, padding: "1.5rem", textAlign: "center", marginBottom: "1.75rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, marginBottom: 6 }}>YOUR AI PHONE NUMBER</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#064E3B", letterSpacing: 2, fontFamily: "monospace" }}>{agent.phone_number}</div>
                </div>

                {/* Option A */}
                <div style={{ marginBottom: "1.5rem", padding: "1.25rem", background: "#F6FEFA", borderRadius: 12, border: "1px solid #D1FAE5" }}>
                  <h3 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#064E3B", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>📱 Option A — Direct Line</h3>
                  <p style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>Use this number directly in your marketing — put it on your website, Google My Business, or ads. Callers speak directly to your AI.</p>
                </div>

                {/* Option B */}
                <div style={{ padding: "1.25rem", background: "#F6FEFA", borderRadius: 12, border: "1px solid #D1FAE5" }}>
                  <h3 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#064E3B", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>🔄 Option B — Call Forwarding</h3>
                  <p style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1rem" }}>Keep your existing number. Forward missed calls to your AI so no lead is ever lost.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {[
                      ["Cell (AT&T/Verizon)", `Dial *72 ${agent.phone_number.replace("+1", "")} to enable forwarding.`],
                      ["RingCentral / Google Voice", `Set ${agent.phone_number} as your forwarding destination in Call Routing.`],
                    ].map(([title, inst]) => (
                      <div key={title} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 9, padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#374151", marginBottom: 3 }}>{title}</div>
                        <div style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>{inst}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📞</div>
                <p style={{ color: "#9CA3AF", marginBottom: "1.5rem", fontSize: "0.88rem" }}>This agent doesn't have a phone number yet.</p>
                <button onClick={() => router.push("/dashboard/agents/create")}
                  style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 9, padding: "11px 24px", fontWeight: 700, cursor: "pointer" }}>
                  Provision a Number
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
