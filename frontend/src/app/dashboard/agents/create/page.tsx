"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const TENANT_ID = "00000000-0000-0000-0000-000000000000";
const API_URL   = (process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app").replace(/\/+$/, "");

/* ── shared styles ─────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
  boxSizing: "border-box",
};
const card: React.CSSProperties = {
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 4px 20px rgba(16,185,129,0.08)", padding: "2.5rem",
  maxWidth: 640, margin: "0 auto",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.8rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5,
};
const btn: React.CSSProperties = {
  width: "100%", background: "#064E3B", color: "#fff", border: "none",
  borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: "0.95rem",
  cursor: "pointer", boxShadow: "0 4px 14px rgba(6,78,59,0.3)",
};
const ghost: React.CSSProperties = {
  width: "100%", background: "none", border: "1.5px solid #E5E7EB",
  borderRadius: 10, padding: "12px", color: "#9CA3AF", fontWeight: 600,
  fontSize: "0.88rem", cursor: "pointer",
};
const hint: React.CSSProperties = { fontSize: "0.75rem", color: "#9CA3AF", marginTop: 5 };

/* ── Step indicator ─────────────────────────────────────────────── */
const STEPS = ["Agent Setup", "Knowledge Base", "Phone Number"];

function StepBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", maxWidth: 640, margin: "0 auto", width: "100%" }}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: step >= i + 1 ? "#064E3B" : "#E5E7EB",
              color: step >= i + 1 ? "#fff" : "#9CA3AF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.85rem",
            }}>{step > i + 1 ? "✓" : i + 1}</div>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", color: step >= i + 1 ? "#064E3B" : "#9CA3AF", whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: step > i + 1 ? "#10B981" : "#E5E7EB", margin: "0 10px" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function CreateAgentPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // Step 1
  const [name, setName]     = useState("");
  const [prompt, setPrompt] = useState("You are a helpful AI assistant for our business. Be warm, concise, and professional.");
  const [voice, setVoice]   = useState("aura-asteria-en");
  const [voiceList, setVoiceList] = useState<any[]>([]);

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

  // Step 2
  const [kbText, setKbText]   = useState("");
  const [kbUrl, setKbUrl]     = useState("");
  const [kbFile, setKbFile]   = useState<File | null>(null);
  const [kbStatus, setKbStatus] = useState<string[]>([]);

  // Step 3
  const [areaCode, setAreaCode] = useState("");
  const [numbers, setNumbers]   = useState<string[]>([]);

  // Created agent id
  const [agentId, setAgentId] = useState<string | null>(null);

  /* ── helpers ── */
  const addStatus = (msg: string) => setKbStatus(p => [...p, msg]);

  /* ── Step 1: Create agent ── */
  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, system_prompt: prompt, tenant_id: TENANT_ID, voice_id: voice }),
      });
      if (!res.ok) throw new Error(await res.text());
      const agent = await res.json();
      setAgentId(agent.id);
      setStep(2);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  /* ── Step 2: Upload KB ── */
  const uploadKB = async () => {
    if (!agentId) return;
    setLoading(true); setKbStatus([]); setError("");
    let uploaded = false;

    // 2a. Plain text
    if (kbText.trim()) {
      try {
        const res = await fetch(`${API_URL}/api/v1/kb/upload-text?agent_id=${agentId}&source=manual`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kbText),
        });
        if (res.ok) { const d = await res.json(); addStatus(`✅ Text ingested — ${d.chunks_stored} chunks stored`); uploaded = true; }
        else addStatus("⚠️ Text upload failed");
      } catch { addStatus("⚠️ Text upload failed"); }
    }

    // 2b. File
    if (kbFile) {
      try {
        const form = new FormData(); form.append("file", kbFile);
        const res = await fetch(`${API_URL}/api/v1/kb/upload-file?agent_id=${agentId}`, { method: "POST", body: form });
        if (res.ok) { const d = await res.json(); addStatus(`✅ File "${d.filename}" ingested — ${d.chunks_stored} chunks`); uploaded = true; }
        else addStatus("⚠️ File upload failed");
      } catch { addStatus("⚠️ File upload failed"); }
    }

    // 2c. URL scrape (background)
    if (kbUrl.trim()) {
      try {
        const res = await fetch(`${API_URL}/api/v1/kb/sync-url?agent_id=${agentId}&url=${encodeURIComponent(kbUrl)}`, { method: "POST" });
        if (res.ok) { addStatus(`🌐 Website sync started for ${kbUrl} — content available in ~30s`); uploaded = true; }
        else addStatus("⚠️ Website sync failed");
      } catch { addStatus("⚠️ Website sync failed"); }
    }

    if (!uploaded) addStatus("ℹ️ No knowledge base content added — you can add it later.");
    setLoading(false);
    setTimeout(() => setStep(3), 800);
  };

  /* ── Step 3: Search & claim number ── */
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

  /* ── render ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div>
        <button onClick={() => router.push("/dashboard/agents")}
          style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, padding: 0, marginBottom: 12 }}>
          ← Back to Agents
        </button>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>Create New Agent</h1>
        <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>Deploy your AI workforce member in under 5 minutes.</p>
      </div>

      <StepBar step={step} />

      {/* Error */}
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 10, padding: "12px 16px", fontSize: "0.88rem", maxWidth: 640, margin: "0 auto", width: "100%" }}>
          {error}
        </div>
      )}

      {/* ─── STEP 1: Agent Setup ─────────────────────────────── */}
      {step === 1 && (
        <div style={card}>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#064E3B", marginBottom: "0.4rem" }}>Agent Details</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "2rem" }}>Give your agent a name, define its persona, and pick a voice.</p>

          <form onSubmit={createAgent} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label style={lbl}>Agent Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Sarah — Sales Representative" required style={inp} />
            </div>

            <div>
              <label style={lbl}>System Prompt & Instructions *</label>
              <textarea rows={7} value={prompt} onChange={e => setPrompt(e.target.value)}
                required style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
              <p style={hint}>Describe your business, how to handle objections, and what to never say.</p>
            </div>

            <div>
              <label style={lbl}>Voice</label>
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
                      <option value="aura-asteria-en">Aria — Female, American English</option>
                      <option value="aura-orion-en">Orion — Male, American English</option>
                      <option value="aura-luna-en">Luna — Female, Soft</option>
                      <option value="aura-arcas-en">Arcas — Male, Deep</option>
                      <option value="aura-stella-en">Stella — Female, Upbeat</option>
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

            <button type="submit" disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating agent..." : "Next: Add Knowledge Base →"}
            </button>
          </form>
        </div>
      )}

      {/* ─── STEP 2: Knowledge Base ──────────────────────────── */}
      {step === 2 && (
        <div style={card}>
          {/* Success badge */}
          <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "10px 16px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✅</span><span style={{ fontWeight: 700, color: "#059669", fontSize: "0.88rem" }}>Agent created! Now train it with your business knowledge.</span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#064E3B", marginBottom: "0.4rem" }}>Knowledge Base</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "2rem" }}>
            Add FAQs, product info, pricing, and policies. Your agent uses this to answer caller questions accurately.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

            {/* Tab: Paste text */}
            <div style={{ border: "1.5px solid #D1FAE5", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#F6FEFA", padding: "10px 16px", borderBottom: "1px solid #D1FAE5", fontWeight: 700, fontSize: "0.82rem", color: "#064E3B", display: "flex", alignItems: "center", gap: 8 }}>
                📝 Paste Text
              </div>
              <div style={{ padding: "1.25rem" }}>
                <textarea rows={6} value={kbText} onChange={e => setKbText(e.target.value)}
                  placeholder={"FAQ, pricing, product descriptions, policies...\n\nExample:\nQ: What are your hours?\nA: We are open Monday to Friday, 9am–6pm EST."}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <p style={hint}>Paste any text content — FAQs, SOPs, product sheets, etc.</p>
              </div>
            </div>

            {/* Tab: Upload file */}
            <div style={{ border: "1.5px solid #D1FAE5", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#F6FEFA", padding: "10px 16px", borderBottom: "1px solid #D1FAE5", fontWeight: 700, fontSize: "0.82rem", color: "#064E3B", display: "flex", alignItems: "center", gap: 8 }}>
                📎 Upload File
              </div>
              <div style={{ padding: "1.25rem" }}>
                <input ref={fileRef} type="file" accept=".txt,.md" style={{ display: "none" }}
                  onChange={e => setKbFile(e.target.files?.[0] || null)} />
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: "2px dashed #D1FAE5", borderRadius: 10, padding: "2rem 1rem",
                    textAlign: "center", cursor: "pointer", background: kbFile ? "#ECFDF5" : "#fafafa",
                    transition: "background 0.2s",
                  }}>
                  {kbFile ? (
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>📄</div>
                      <div style={{ fontWeight: 700, color: "#059669", fontSize: "0.88rem" }}>{kbFile.name}</div>
                      <div style={{ color: "#9CA3AF", fontSize: "0.75rem", marginTop: 2 }}>Click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>⬆️</div>
                      <div style={{ fontWeight: 600, color: "#374151", fontSize: "0.88rem" }}>Click to upload .txt or .md file</div>
                      <div style={{ color: "#9CA3AF", fontSize: "0.75rem", marginTop: 4 }}>Max 2MB</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tab: Website URL */}
            <div style={{ border: "1.5px solid #D1FAE5", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#F6FEFA", padding: "10px 16px", borderBottom: "1px solid #D1FAE5", fontWeight: 700, fontSize: "0.82rem", color: "#064E3B", display: "flex", alignItems: "center", gap: 8 }}>
                🌐 Sync Website
              </div>
              <div style={{ padding: "1.25rem" }}>
                <input type="url" value={kbUrl} onChange={e => setKbUrl(e.target.value)}
                  placeholder="https://yourcompany.com" style={inp} />
                <p style={hint}>We'll scrape up to 5 pages automatically. Runs in the background.</p>
              </div>
            </div>

            {/* Status messages */}
            {kbStatus.length > 0 && (
              <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 16px" }}>
                {kbStatus.map((s, i) => (
                  <div key={i} style={{ fontSize: "0.85rem", color: "#064E3B", padding: "3px 0", fontFamily: "monospace" }}>{s}</div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={uploadKB} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Uploading..." : "Save & Continue →"}
              </button>
              <button onClick={() => setStep(3)} style={ghost}>
                Skip — add knowledge base later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Phone Number ────────────────────────────── */}
      {step === 3 && (
        <div style={card}>
          <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "10px 16px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🧠</span><span style={{ fontWeight: 700, color: "#059669", fontSize: "0.88rem" }}>Knowledge base ready! Now connect a phone number.</span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#064E3B", marginBottom: "0.4rem" }}>Setup Phone Number</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "2rem" }}>Search by area code to get a local number for your AI agent.</p>

          <form onSubmit={searchNumbers} style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
            <input type="text" value={areaCode} onChange={e => setAreaCode(e.target.value)}
              placeholder="Area code, e.g. 212" maxLength={3} required style={{ ...inp, flex: 1 }} />
            <button type="submit" disabled={loading}
              style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {numbers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <label style={lbl}>Available Numbers</label>
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

          <button onClick={() => router.push(`/dashboard/agents/${agentId}`)} style={ghost}>
            Skip for now — configure later
          </button>
        </div>
      )}
    </div>
  );
}
