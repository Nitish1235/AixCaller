"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL   = (process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app").replace(/\/+$/, "");
const getTenantId = () => {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  let tid = match ? decodeURIComponent(match[1]) : null;
  
  if (tid) {
    localStorage.setItem("tenant_id", tid);
    return tid;
  }
  
  return localStorage.getItem("tenant_id") || "00000000-0000-0000-0000-000000000000";
};

const TENANT_ID = getTenantId();

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [agent, setAgent]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [name, setName]     = useState("");
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice]   = useState("");
  const [voiceList, setVoiceList] = useState<any[]>([]);
  const [forwardingNumber, setForwardingNumber] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/admin/voices`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setVoiceList(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/v1/agents?tenant_id=${TENANT_ID}`);
        const list = await res.json();
        const found = list.find((a: any) => a.id === id);
        if (found) { 
          setAgent(found); 
          setName(found.name); 
          setPrompt(found.system_prompt || ""); 
          setVoice(found.voice_id || "aura-asteria-en");
          setForwardingNumber(found.forwarding_number || "");
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetch_();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/v1/agents/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, system_prompt: prompt, voice_id: voice, forwarding_number: forwardingNumber }),
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
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select value={voice} onChange={e => setVoice(e.target.value)} style={{ ...inp, flex: 1 }}>
                    {voiceList.length > 0 ? (
                      voiceList.map(v => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name} — {v.gender} ({v.voice_id})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="aura-2-thalia-en">Thalia (F - Energetic)</option>
                        <option value="aura-2-amalthea-en">Amalthea (F - Engaging)</option>
                        <option value="aura-2-andromeda-en">Andromeda (F - Casual)</option>
                        <option value="aura-2-apollo-en">Apollo (M - Confident)</option>
                        <option value="aura-2-arcas-en">Arcas (M - Smooth)</option>
                        <option value="aura-2-aries-en">Aries (M - Warm)</option>
                        <option value="aura-2-aurora-en">Aurora (F - Cheerful)</option>
                        <option value="aura-2-delia-en">Delia (F - Friendly)</option>
                        <option value="aura-2-electra-en">Electra (F - Professional)</option>
                        <option value="aura-2-harmonia-en">Harmonia (F - Empathetic)</option>
                        <option value="aura-2-helena-en">Helena (F - Caring)</option>
                        <option value="aura-2-hermes-en">Hermes (M - Professional)</option>
                        <option value="aura-2-hyperion-en">Hyperion (M - Empathetic)</option>
                        <option value="aura-2-juno-en">Juno (F - Melodic)</option>
                        <option value="aura-2-jupiter-en">Jupiter (M - Knowledgeable)</option>
                        <option value="aura-2-mars-en">Mars (M - Trustworthy)</option>
                        <option value="aura-2-neptune-en">Neptune (M - Polite)</option>
                        <option value="aura-2-ophelia-en">Ophelia (F - Enthusiastic)</option>
                        <option value="aura-2-orion-en">Orion (M - Polite)</option>
                        <option value="aura-2-orpheus-en">Orpheus (M - Trustworthy)</option>
                        <option value="aura-2-phoebe-en">Phoebe (F - Warm)</option>
                        <option value="aura-2-pluto-en">Pluto (M - Empathetic)</option>
                        <option value="aura-2-saturn-en">Saturn (M - Confident)</option>
                        <option value="aura-2-selene-en">Selene (F - Engaging)</option>
                        <option value="aura-2-theia-en">Theia (F - Sincere)</option>
                        <option value="aura-2-vesta-en">Vesta (F - Patient)</option>
                      </>
                    )}
                  </select>
                  <button type="button" onClick={() => {
                    const selectedVoice = voiceList.find(v => v.voice_id === voice);
                    if (selectedVoice?.preview_url && audioRef.current) {
                      audioRef.current.src = selectedVoice.preview_url;
                      audioRef.current.play();
                    } else {
                      alert("Preview not generated yet for this voice! Use Admin panel.");
                    }
                  }} style={{
                    padding: "11px 16px", borderRadius: 8, border: "1.5px solid #D1FAE5", background: "#F6FEFA",
                    color: "#059669", fontWeight: 800, cursor: "pointer"
                  }}>
                    ▶ Play
                  </button>
                </div>
                <audio ref={audioRef} style={{ display: "none" }} />
              </div>
              <div style={{ borderTop: "1px solid #D1FAE5", paddingTop: "1.25rem", marginTop: "0.5rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "0.85rem", color: "#064E3B", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>📞 Call Forwarding (Transfer to Human)</h3>
                <label style={label}>Transfer Number</label>
                <input type="tel" value={forwardingNumber} onChange={e => setForwardingNumber(e.target.value)}
                  placeholder="e.g. +12125550199" style={inp} />
                <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4 }}>
                  The number the AI will transfer the caller to if they ask for a human or if the AI can't help.
                </p>
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
