"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchVoices, createAgent as createAgentApi, apiPost, apiGet, API_BASE_URL, getTenantId } from "@/lib/api";

// Removed top-level TENANT_ID constant

/* ── shared styles ─────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  border: "1.5px solid var(--border)", fontSize: "0.9rem", color: "var(--text)",
  outline: "none", fontFamily: "inherit", background: "#fff",
  boxSizing: "border-box",
};
const card: React.CSSProperties = {
  background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)", padding: "2.5rem",
  maxWidth: 640, margin: "0 auto",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5,
};
const btn: React.CSSProperties = {
  width: "100%", background: "var(--blue)", color: "#fff", border: "none",
  borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: "0.95rem",
  cursor: "pointer", boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)",
};
const ghost: React.CSSProperties = {
  width: "100%", background: "none", border: "1.5px solid var(--border)",
  borderRadius: 10, padding: "12px", color: "var(--text-muted)", fontWeight: 600,
  fontSize: "0.88rem", cursor: "pointer",
};
const hint: React.CSSProperties = { fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 5 };

const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States (+1)" },
  { code: "GB", name: "United Kingdom (+44)" },
  { code: "CA", name: "Canada (+1)" },
  { code: "AU", name: "Australia (+61)" },
  { code: "AR", name: "Argentina (+54)" },
  { code: "AT", name: "Austria (+43)" },
  { code: "BE", name: "Belgium (+32)" },
  { code: "BR", name: "Brazil (+55)" },
  { code: "CL", name: "Chile (+56)" },
  { code: "CO", name: "Colombia (+57)" },
  { code: "DK", name: "Denmark (+45)" },
  { code: "FI", name: "Finland (+358)" },
  { code: "FR", name: "France (+33)" },
  { code: "DE", name: "Germany (+49)" },
  { code: "HK", name: "Hong Kong (+852)" },
  { code: "IE", name: "Ireland (+353)" },
  { code: "IL", name: "Israel (+972)" },
  { code: "IT", name: "Italy (+39)" },
  { code: "JP", name: "Japan (+81)" },
  { code: "MX", name: "Mexico (+52)" },
  { code: "NL", name: "Netherlands (+31)" },
  { code: "NZ", name: "New Zealand (+64)" },
  { code: "NO", name: "Norway (+47)" },
  { code: "PE", name: "Peru (+51)" },
  { code: "PL", name: "Poland (+48)" },
  { code: "PT", name: "Portugal (+351)" },
  { code: "SG", name: "Singapore (+65)" },
  { code: "ZA", name: "South Africa (+27)" },
  { code: "ES", name: "Spain (+34)" },
  { code: "SE", name: "Sweden (+46)" },
  { code: "CH", name: "Switzerland (+41)" }
];

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
              background: step >= i + 1 ? "var(--blue)" : "#E5E7EB",
              color: step >= i + 1 ? "#fff" : "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.85rem",
            }}>{step > i + 1 ? "✓" : i + 1}</div>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", color: step >= i + 1 ? "var(--blue)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: step > i + 1 ? "var(--blue)" : "#E5E7EB", margin: "0 10px" }} />
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
  const [businessName, setBusinessName] = useState("");
  const [prompt, setPrompt] = useState("You are a helpful AI assistant for our business. Be warm, concise, and professional.");
  const [voice, setVoice]   = useState("Telnyx.Ultra.a4a16c5e-5902-4732-b9b6-2a48efd2e11b");
  const [voiceList, setVoiceList] = useState<any[]>([]);

  useEffect(() => {
    fetchVoices()
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
  const [countryCode, setCountryCode] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [numbers, setNumbers]   = useState<any[]>([]);

  // Created agent id
  const [agentId, setAgentId] = useState<string | null>(null);

  // Billing plan
  const [planTier, setPlanTier] = useState<string>("free");
  const [subStatus, setSubStatus] = useState<string>("inactive");

  useEffect(() => {
    const tid = getTenantId();
    if (tid && tid !== "00000000-0000-0000-0000-000000000000") {
      apiGet(`/billing/subscription?tenant_id=${tid}`)
        .then((data: any) => {
          setPlanTier(data?.plan_tier ?? "free");
          setSubStatus(data?.subscription_status ?? "inactive");
        })
        .catch(() => {});
    }
  }, []);

  /* ── helpers ── */
  const addStatus = (msg: string) => setKbStatus(p => [...p, msg]);

  /* ── Step 1: Create agent ── */
  const createAgent = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    const tid = getTenantId();
    try {
      const agent = await createAgentApi({
        name,
        business_name: businessName.trim() || null,
        system_prompt: prompt,
        tenant_id: tid,
        voice_id: voice,
      });
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
        const d = await apiPost(`/kb/upload-text?agent_id=${agentId}&source=manual`, kbText);
        addStatus(`✅ Text ingested — ${d.chunks_stored} chunks stored`); uploaded = true;
      } catch { addStatus("⚠️ Text upload failed"); }
    }

    // 2b. File
    if (kbFile) {
      try {
        const form = new FormData(); form.append("file", kbFile);
        const res = await fetch(`${API_BASE_URL}/kb/upload-file?agent_id=${agentId}`, { method: "POST", body: form });
        if (res.ok) { const d = await res.json(); addStatus(`✅ File "${d.filename}" ingested — ${d.chunks_stored} chunks`); uploaded = true; }
        else addStatus("⚠️ File upload failed");
      } catch { addStatus("⚠️ File upload failed"); }
    }

    // 2c. URL scrape (background)
    if (kbUrl.trim()) {
      try {
        await apiPost(`/kb/sync-url?agent_id=${agentId}&url=${encodeURIComponent(kbUrl)}`, {});
        addStatus(`🌐 Website sync started for ${kbUrl} — content available in ~30s`); uploaded = true;
      } catch { addStatus("⚠️ Website sync failed"); }
    }

    if (!uploaded) addStatus("ℹ️ No knowledge base content added — you can add it later.");
    setLoading(false);
    setTimeout(() => setStep(3), 800);
  };

  /* ── Step 3: Search & claim number ── */
  const searchNumbers = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(""); setNumbers([]);
    try {
      const data = await apiPost("/numbers/search", { country_code: countryCode, area_code: areaCode, limit: 5 });
      if (data.numbers && data.numbers.length > 0) {
        setNumbers(data.numbers);
      } else {
        throw new Error(`No numbers available for ${countryCode} ${areaCode ? `area code ${areaCode}` : ""}. Please try another one.`);
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const claimNumber = async (phone: string) => {
    if (!agentId) return; setLoading(true);
    const tid = getTenantId();
    try {
      await apiPost("/numbers/purchase", { phone_number: phone, tenant_id: tid, agent_id: agentId });
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
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, padding: 0, marginBottom: 12 }}>
          ← Back to Agents
        </button>
        <h1 style={{ fontWeight: 800, fontSize: "1.6rem", color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>Create New Agent</h1>
        <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>Deploy your AI workforce member in under 5 minutes.</p>
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
          {/* Marketplace CTA */}
          <div
            onClick={() => router.push("/dashboard/agents/marketplace")}
            style={{
              background: "linear-gradient(135deg, var(--blue-light), #dbeafe)",
              border: "1px solid rgba(29, 78, 216, 0.25)",
              borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "1.8rem" }}>✨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--blue)", fontSize: "0.92rem" }}>
                Want a head start?
              </div>
              <div style={{ color: "var(--blue)", opacity: 0.8, fontSize: "0.82rem", marginTop: 2 }}>
                Choose a pre-built template — clinic, e-commerce, real estate, restaurant.
              </div>
            </div>
            <div style={{ color: "var(--blue)", fontWeight: 700 }}>→</div>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", marginBottom: "0.4rem" }}>Agent Details</h2>
          <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginBottom: "2rem" }}>Give your agent a name, define its persona, and pick a voice.</p>

          <form onSubmit={createAgent} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={lbl}>Agent Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sarah" required style={inp} />
              </div>
              <div>
                <label style={lbl}>Business Name</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. NovaEdge Solutions" style={inp} />
              </div>
            </div>
            {businessName.trim() && name.trim() && (
              <div style={{ padding: "10px 14px", background: "var(--blue-light)", borderRadius: 8, border: "1px dashed rgba(29, 78, 216, 0.25)", fontSize: "0.85rem", color: "var(--blue)", fontStyle: "italic" }}>
                💬 Greeting: "Hi, thanks for calling {businessName.trim()}. This is {name.trim()} — how can I help you today?"
              </div>
            )}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>System Prompt & Instructions *</label>
              </div>
              
              {/* Prompt Templates */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {[
                  { label: "General Support", text: "You are a helpful customer support agent for our business. Your goal is to answer FAQs, provide order status, and resolve issues politely. Keep answers concise." },
                  { label: "Real Estate", text: "You are a friendly real estate receptionist. Your goal is to qualify leads by asking about their budget, timeline, and preferred neighborhoods, and then book a property viewing." },
                  { label: "Dental Clinic", text: "You are a receptionist for a dental clinic. Your goal is to help patients book appointments, answer basic questions about our services (cleaning, whitening), and collect insurance info." },
                  { label: "E-commerce Sales", text: "You are an energetic sales assistant for our e-commerce store. Your goal is to help customers find products, explain the return policy, and highlight our current promotions." },
                  { label: "Restaurant Host", text: "You are a warm host for our restaurant. Your goal is to take table reservations, answer questions about the menu (including dietary restrictions), and explain parking availability." },
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPrompt(p.text)}
                    style={{
                      background: prompt === p.text ? "var(--blue)" : "#f1f5f9",
                      color: prompt === p.text ? "#fff" : "var(--text-muted)",
                      border: prompt === p.text ? "1px solid var(--blue)" : "1px solid #e2e8f0",
                      borderRadius: 20, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600,
                      cursor: "pointer", transition: "all 0.2s ease"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <textarea rows={7} value={prompt} onChange={e => setPrompt(e.target.value)}
                required style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
              <p style={hint}>Describe your business, how to handle objections, and what to never say. You can freely edit the text above.</p>
            </div>

            <div>
              <label style={lbl}>Voice</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select value={voice} onChange={e => setVoice(e.target.value)} style={{ ...inp, flex: 1 }}>
                  {voiceList.length > 0 ? (
                    voiceList.map(v => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name} — {v.gender}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Telnyx.Ultra.f786b574-daa5-4673-aa0c-cbe3e8534c02">Katie (F - Friendly Fixer)</option>
                      <option value="Telnyx.Ultra.a4a16c5e-5902-4732-b9b6-2a48efd2e11b">Grace (F - Professional / Warm)</option>
                      <option value="Telnyx.Ultra.ebecd063-10f4-422e-a8ff-556ce5c4d4e4">Ava (F - Friendly / Bright)</option>
                      <option value="Telnyx.Ultra.f6ff7c0c-e396-40a9-a70b-f7607edb6937">Emma (F - Empathetic / Sincere)</option>
                      <option value="Telnyx.Ultra.2747b6cf-fa34-460c-97db-267566918881">Allie (F - Friendly / Expressive)</option>
                      <option value="Telnyx.Ultra.1d3ba41a-96e6-44ad-aabb-9817c56caa68">Mia (F - Direct / Business)</option>
                      <option value="Telnyx.Ultra.00a77add-48d5-4ef6-8157-71e5437b282d">Callie (F - Bright / Engaging)</option>
                      <option value="Telnyx.Ultra.01fd7d67-d2a0-4e4e-8c48-42611c71a926">Skyler (F - Natural / Conversational)</option>
                      <option value="Telnyx.Ultra.050f5a7a-9d2b-4b76-84e3-2d056a0a3eb0">Kelsey (F - Soft / Gentle)</option>
                      <option value="Telnyx.Ultra.d132064c-b931-4a80-bf0d-02a331ec4572">George (M - Professional / Confident)</option>
                      <option value="Telnyx.Ultra.42b39f37-515f-4eee-8546-73e841679c1d">James (M - Calm / Authoritative)</option>
                      <option value="Telnyx.Ultra.47c38ca4-5f35-497b-b1a3-415245fb35e1">Daniel (M - Warm / Trustworthy)</option>
                      <option value="Telnyx.Ultra.2d5b8c3a-116c-4741-acaf-ba4fa289eba2">Benji (M - Playful / High-energy)</option>
                      <option value="Telnyx.Ultra.bbee10a8-4f08-4c5c-8282-e69299115055">Ben (M - Helpful man)</option>
                      <option value="Telnyx.Ultra.6fccb471-26f7-4f7a-93dd-542935db6c20">Wesley (M - Clean / Clear)</option>
                      <option value="Telnyx.Ultra.0d42f0f6-c019-4082-b250-1c16133d1c82">Howard (M - Deep / Narrative)</option>
                      <option value="Telnyx.Ultra.3dcaa773-fb1a-47f7-82a4-1bf756c4e1fb">Harry (M - Youthful / Casual)</option>
                      <option value="Telnyx.Ultra.3faa81ae-d3d8-4ab1-9e44-e50e46d33c30">Jasper (M - Smooth / Conversational)</option>
                      <option value="Telnyx.Ultra.3f04e815-3260-4f50-8fd9-af9c657be4c2">Arvin (M - Energetic / Direct)</option>
                      <option value="Telnyx.Ultra.23112795-d54e-4560-9568-791a87c30201">Darian (M - Professional / Grounded)</option>
                    </>
                  )}
                </select>
                <button 
                  type="button" 
                  onClick={() => {
                    const selectedVoice = voiceList.find(v => v.voice_id === voice);
                    let url = selectedVoice?.preview_url;
                    if (!url && voice.startsWith("Telnyx.Ultra.")) {
                      const name = voice.split(".").pop();
                      if (name) {
                        url = `https://storage.googleapis.com/aixcaller-assets/voices/telnyx_ultra_${name.toLowerCase()}.mp3`;
                      }
                    }
                    if (url && audioRef.current) {
                      audioRef.current.src = url;
                      audioRef.current.play();
                    } else {
                      alert("Preview not available yet. Please make sure admin has generated the voices.");
                    }
                  }} 
                  style={{
                    padding: "11px 18px", 
                    borderRadius: 12, 
                    border: "1px solid rgba(29, 78, 216, 0.3)", 
                    background: "linear-gradient(135deg, var(--blue-light) 0%, rgba(29, 78, 216, 0.08) 100%)", 
                    color: "var(--blue)", 
                    fontWeight: 800, 
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(29, 78, 216, 0.05)",
                    backdropFilter: "blur(4px)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(29, 78, 216, 0.15)";
                    e.currentTarget.style.background = "linear-gradient(135deg, var(--blue-light) 0%, rgba(29, 78, 216, 0.12) 100%)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(29, 78, 216, 0.05)";
                    e.currentTarget.style.background = "linear-gradient(135deg, var(--blue-light) 0%, rgba(29, 78, 216, 0.08) 100%)";
                  }}
                >
                  ▶ Audition
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
          <div style={{ background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✅</span><span style={{ fontWeight: 700, color: "var(--blue)", fontSize: "0.88rem" }}>Agent created! Now train it with your business knowledge.</span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", marginBottom: "0.4rem" }}>Knowledge Base</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Add FAQs, product info, pricing, and policies. Your agent uses this to answer caller questions accurately.
          </p>

          {/* Guide: what to upload */}
          <div style={{
            background: "linear-gradient(135deg, var(--surface), var(--blue-light))",
            border: "1px solid rgba(29, 78, 216, 0.15)", borderRadius: 12,
            padding: "1rem 1.25rem", marginBottom: "1.5rem",
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--blue)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
              💡 What to upload for the best agent answers
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text)", fontSize: "0.82rem", lineHeight: 1.75 }}>
              <li><strong>Business basics</strong> — name, address, phone, hours, location, parking</li>
              <li><strong>Products / services</strong> — what you offer, key features, who it's for</li>
              <li><strong>Pricing</strong> — plan names, prices, what's included, discounts</li>
              <li><strong>FAQs</strong> — common customer questions with clear answers</li>
              <li><strong>Policies</strong> — returns, refunds, shipping, cancellation, privacy</li>
              <li><strong>Process flows</strong> — how to book, order, sign up, get support</li>
              <li><strong>Team / expertise</strong> — doctors, agents, specialties, languages spoken</li>
            </ul>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 10, fontStyle: "italic" }}>
              Tip: Write in plain Q&amp;A or short bullets. Avoid scanned PDFs — text-only works best.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

            {/* Tab: Paste text */}
            <div style={{ border: "1.5px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: "var(--blue-light)", padding: "10px 16px", borderBottom: "1.5px solid var(--border)", fontWeight: 700, fontSize: "0.82rem", color: "var(--blue)", display: "flex", alignItems: "center", gap: 8 }}>
                📝 Paste Text
              </div>
              <div style={{ padding: "1.25rem" }}>
                <textarea rows={7} value={kbText} onChange={e => setKbText(e.target.value)}
                  placeholder={"Example format:\n\nQ: What are your hours?\nA: We're open Monday to Saturday, 9 AM to 7 PM.\n\nQ: What services do you offer?\nA: AI customer support, voice agents, automation tools.\n\nQ: How can I book a demo?\nA: Visit our website or reply to this call to schedule one."}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <p style={hint}>Paste any text content — FAQs, SOPs, product sheets, policies.</p>
              </div>
            </div>

            {/* Tab: Upload file */}
            <div style={{ border: "1.5px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: "var(--blue-light)", padding: "10px 16px", borderBottom: "1.5px solid var(--border)", fontWeight: 700, fontSize: "0.82rem", color: "var(--blue)", display: "flex", alignItems: "center", gap: 8 }}>
                📎 Upload File
              </div>
              <div style={{ padding: "1.25rem" }}>
                <input ref={fileRef} type="file" accept=".txt,.md" style={{ display: "none" }}
                  onChange={e => setKbFile(e.target.files?.[0] || null)} />
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border)", borderRadius: 10, padding: "2rem 1rem",
                    textAlign: "center", cursor: "pointer", background: kbFile ? "var(--blue-light)" : "#fafafa",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--blue)";
                    e.currentTarget.style.background = kbFile ? "var(--blue-light)" : "var(--surface)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = kbFile ? "var(--blue-light)" : "#fafafa";
                  }}
                >
                  {kbFile ? (
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>📄</div>
                      <div style={{ fontWeight: 700, color: "var(--blue)", fontSize: "0.88rem" }}>{kbFile.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 2 }}>Click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>⬆️</div>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.88rem" }}>Click to upload .txt or .md file</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 4 }}>Max 2MB · plain text only</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Website URL sync */}
            <div style={{
              border: "1.5px dashed var(--border)", borderRadius: 12, overflow: "hidden"
            }}>
              <div style={{ background: "var(--surface)", padding: "10px 16px", borderBottom: "1.5px dashed var(--border)", fontWeight: 600, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🌐 Sync Website URL</span>
              </div>
              <div style={{ padding: "0.85rem 1.25rem" }}>
                <input
                  type="url"
                  value={kbUrl}
                  onChange={e => setKbUrl(e.target.value)}
                  placeholder="https://example.com"
                  style={{ ...inp, padding: "8px 12px" }}
                />
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 8 }}>
                  We will extract the text content from this webpage.
                </div>
              </div>
            </div>

            {/* Status messages */}
            {kbStatus.length > 0 && (
              <div style={{ background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)", borderRadius: 10, padding: "12px 16px" }}>
                {kbStatus.map((s, i) => (
                  <div key={i} style={{ fontSize: "0.85rem", color: "var(--blue)", padding: "3px 0", fontFamily: "monospace" }}>{s}</div>
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
          <div style={{ background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🧠</span><span style={{ fontWeight: 700, color: "var(--blue)", fontSize: "0.88rem" }}>Knowledge base ready! Now connect a phone number.</span>
          </div>

          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", marginBottom: "0.4rem" }}>Setup Phone Number</h2>

          {/* ── Free plan gate ── */}
          {(planTier === "free" || subStatus !== "active") ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#92400E", fontSize: "0.95rem", marginBottom: 4 }}>Phone numbers require a paid plan</div>
                  <div style={{ fontSize: "0.85rem", color: "#78350F", lineHeight: 1.5 }}>
                    Upgrade to Starter, Pro, or Premium to claim a real phone number and activate your AI agent.
                  </div>
                </div>
              </div>

              {/* Plan cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                {[
                  { name: "Starter", price: "$50", minutes: "200 min", tier: "starter" },
                  { name: "Pro Business", price: "$119", minutes: "500 min", tier: "pro", highlight: true },
                  { name: "Premium", price: "$250", minutes: "1100 min", tier: "premium" },
                ].map(p => (
                  <div key={p.tier} style={{
                    border: p.highlight ? "2px solid var(--blue)" : "1.5px solid var(--border)",
                    borderRadius: 12, padding: "1.25rem",
                    background: p.highlight ? "var(--blue)" : "#fff",
                    color: p.highlight ? "#fff" : "var(--text)",
                    display: "flex", flexDirection: "column", gap: 6,
                    boxShadow: p.highlight ? "0 8px 24px rgba(29, 78, 216, 0.2)" : "0 4px 12px rgba(0, 0, 0, 0.02)",
                    transition: "all 0.2s ease",
                  }}>
                    <div style={{ fontWeight: 800, fontSize: "1rem" }}>{p.name}</div>
                    <div style={{ fontWeight: 800, fontSize: "1.6rem", lineHeight: 1 }}>{p.price}<span style={{ fontSize: "0.8rem", fontWeight: 600, opacity: 0.7 }}>/mo</span></div>
                    <div style={{ fontSize: "0.78rem", opacity: p.highlight ? 0.9 : 0.8, color: p.highlight ? "#fff" : "var(--text-muted)" }}>{p.minutes} included</div>
                    <a
                      href={`/dashboard/billing`}
                      style={{
                        marginTop: 8, display: "block", textAlign: "center",
                        background: p.highlight ? "#fff" : "var(--blue)",
                        color: p.highlight ? "var(--blue)" : "#fff", borderRadius: 8, padding: "8px",
                        fontWeight: 700, fontSize: "0.82rem", textDecoration: "none",
                        boxShadow: p.highlight ? "0 4px 10px rgba(0,0,0,0.15)" : "none",
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      Choose {p.name} →
                    </a>
                  </div>
                ))}
              </div>

              <button onClick={() => router.push(`/dashboard/agents/${agentId}`)} style={ghost}>
                Skip — configure number later
              </button>
            </div>
          ) : (
            /* ── Paid plan: show normal number search ── */
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>Search by area code to get a local number for your AI agent.</p>

              <form onSubmit={searchNumbers} style={{ display: "flex", gap: 10, marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={{ ...inp, width: 200 }}>
                  {SUPPORTED_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <input type="text" value={areaCode} onChange={e => setAreaCode(e.target.value)}
                  placeholder="Area code (optional)" style={{ ...inp, flex: 1 }} />
                <button type="submit" disabled={loading}
                  style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, boxShadow: "0 4px 14px rgba(29, 78, 216, 0.2)" }}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>

              {numbers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <label style={lbl}>Available Numbers</label>
                  {numbers.map(n => (
                    <div key={n.phone_number} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--blue-light)", border: "1.5px solid var(--border)", borderRadius: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 700, color: "var(--blue)", letterSpacing: 1 }}>{n.phone_number}</span>
                      </div>
                      <button onClick={() => claimNumber(n.phone_number)} disabled={loading}
                        style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 10px rgba(29, 78, 216, 0.2)" }}>
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
      )}
    </div>
  );
}
