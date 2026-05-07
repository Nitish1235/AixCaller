"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchVoices, fetchAgents, updateAgent, apiPost, API_BASE_URL } from "@/lib/api";

const getTenantId = () => {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  let tid = match ? decodeURIComponent(match[1]) : null;
  if (tid) { localStorage.setItem("tenant_id", tid); return tid; }
  return localStorage.getItem("tenant_id") || "00000000-0000-0000-0000-000000000000";
};
const TENANT_ID = getTenantId();

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5,
};
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)", padding: "1.75rem", ...extra,
});
const btn = (c = "#064E3B", extra?: React.CSSProperties): React.CSSProperties => ({
  background: c, color: "#fff", border: "none", borderRadius: 9,
  padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", ...extra,
});

export default function AgentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Agent state
  const agentId = Array.isArray(id) ? id[0] : (id as string);
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice] = useState("");
  const [voiceList, setVoiceList] = useState<any[]>([]);
  const [forwardingNumber, setForwardingNumber] = useState("");

  // Telephony
  const [provisioning, setProvisioning] = useState(false);
  const [areaCode, setAreaCode] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [provError, setProvError] = useState("");

  // Tab
  const [tab, setTab] = useState<"settings" | "kb">("settings");

  // KB state
  const [kbSources, setKbSources] = useState<any[]>([]);
  const [kbTotal, setKbTotal] = useState(0);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbTab, setKbTab] = useState<"text" | "file" | "url">("text");
  const [kbText, setKbText] = useState("");
  const [kbUrl, setKbUrl] = useState("");
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [kbStatus, setKbStatus] = useState("");
  const [kbBusy, setKbBusy] = useState(false);

  useEffect(() => {
    fetchVoices().then(d => { if (Array.isArray(d) && d.length > 0) setVoiceList(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchAgents(TENANT_ID);
        const found = list.find((a: any) => a.id === agentId);
        if (found) {
          setAgent(found);
          setName(found.name);
          setPrompt(found.system_prompt || "");
          setVoice(found.voice_id || "aura-2-thalia-en");
          setForwardingNumber(found.forwarding_number || "");
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const loadKb = async () => {
    setKbLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/kb/chunks?agent_id=${agentId}`);
      const data = await res.json();
      setKbSources(data.sources || []);
      setKbTotal(data.total_chunks || 0);
    } catch (e) { console.error(e); } finally { setKbLoading(false); }
  };

  useEffect(() => { if (tab === "kb") loadKb(); }, [tab]);

  const save = async () => {
    setSaving(true);
    try {
      await updateAgent(id as string, { name, system_prompt: prompt, voice_id: voice, forwarding_number: forwardingNumber });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const ingestText = async () => {
    if (!kbText.trim()) return;
    setKbBusy(true); setKbStatus("");
    try {
      const res = await fetch(`${API_BASE_URL}/kb/upload-text?agent_id=${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: kbText, source: "manual" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKbStatus(`✓ Stored ${data.chunks_stored} chunks`);
      setKbText(""); loadKb();
    } catch (e: any) { setKbStatus(`✗ Upload failed: ${e.message}`); }
    setKbBusy(false);
  };

  const ingestFile = async () => {
    if (!kbFile) return;
    setKbBusy(true); setKbStatus("");
    try {
      const form = new FormData();
      form.append("file", kbFile);
      const res = await fetch(`${API_BASE_URL}/kb/upload-file?agent_id=${agentId}`, {
        method: "POST", body: form
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKbStatus(`✓ Stored ${data.chunks_stored} chunks from ${data.filename}`);
      setKbFile(null); loadKb();
    } catch (e: any) { setKbStatus(`✗ Upload failed: ${e.message}`); }
    setKbBusy(false);
  };

  const ingestUrl = async () => {
    if (!kbUrl.trim()) return;
    setKbBusy(true); setKbStatus("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/kb/sync-url?agent_id=${agentId}&url=${encodeURIComponent(kbUrl)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKbStatus(`✓ ${data.message}`);
      setKbUrl(""); setTimeout(() => loadKb(), 3000); // URL sync is async, wait a bit
    } catch (e: any) { setKbStatus(`✗ Sync failed: ${e.message}`); }
    setKbBusy(false);
  };

  const clearKb = async () => {
    if (!confirm("Delete ALL knowledge base content for this agent?")) return;
    setKbBusy(true);
    try {
      await fetch(`${API_BASE_URL}/kb/clear?agent_id=${agentId}`, { method: "DELETE" });
      setKbStatus("✓ Knowledge base cleared");
      loadKb();
    } catch { setKbStatus("✗ Failed to clear"); }
    setKbBusy(false);
  };

  const searchNumbers = async () => {
    if (!areaCode) return;
    setProvLoading(true); setProvError(""); setAvailableNumbers([]);
    try {
      const data = await apiPost("/numbers/search", { area_code: areaCode, limit: 5 });
      if (data.numbers?.length > 0) setAvailableNumbers(data.numbers);
      else setProvError(`No numbers for area code ${areaCode}.`);
    } catch { setProvError("Failed to search numbers."); }
    setProvLoading(false);
  };

  const claimNumber = async (phone: string) => {
    setProvLoading(true); setProvError("");
    try {
      await apiPost("/numbers/purchase", { phone_number: phone, tenant_id: TENANT_ID, agent_id: id });
      const list = await fetchAgents(TENANT_ID);
      const updated = list.find((a: any) => a.id === id);
      if (updated) setAgent(updated);
      setProvisioning(false);
    } catch { setProvError("Failed to purchase number."); }
    setProvLoading(false);
  };

  if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Loading...</div>;
  if (!agent) return <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Agent not found.</div>;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem",
    cursor: "pointer", border: "none",
    background: active ? "#064E3B" : "#F6FEFA",
    color: active ? "#fff" : "#059669",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard/agents")}
            style={{ background: "#F6FEFA", border: "1.5px solid #D1FAE5", borderRadius: 9, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem", color: "#064E3B" }}>←</button>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: "1.5rem", color: "#064E3B", margin: 0 }}>{agent.name}</h1>
            <p style={{ color: "#9CA3AF", margin: "2px 0 0", fontSize: "0.85rem" }}>Configure behaviour and knowledge.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 700 }}>✓ Saved!</span>}
          <button onClick={save} disabled={saving} style={btn("#064E3B", { opacity: saving ? 0.7 : 1 })}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={tabStyle(tab === "settings")} onClick={() => setTab("settings")}>⚙️ Settings</button>
        <button style={tabStyle(tab === "kb")} onClick={() => setTab("kb")}>
          📚 Knowledge Base {kbTotal > 0 && <span style={{ background: "#10B981", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: "0.7rem", marginLeft: 6 }}>{kbTotal}</span>}
        </button>
      </div>

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Left */}
          <div style={card()}>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: "1.5rem" }}>Agent Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={lbl}>Agent Name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>System Prompt</label>
                <textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <p style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: 4 }}>How your agent should behave and what it knows about your business.</p>
              </div>
              <div>
                <label style={lbl}>Voice</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select value={voice} onChange={e => setVoice(e.target.value)} style={{ ...inp, flex: 1 }}>
                    {voiceList.length > 0 ? voiceList.map(v => (
                      <option key={v.voice_id} value={v.voice_id}>{v.name} — {v.gender}</option>
                    )) : (
                      <>
                        <option value="aura-2-thalia-en">Thalia (F - Energetic)</option>
                        <option value="aura-2-amalthea-en">Amalthea (F - Engaging)</option>
                        <option value="aura-2-apollo-en">Apollo (M - Confident)</option>
                        <option value="aura-2-arcas-en">Arcas (M - Smooth)</option>
                        <option value="aura-2-aurora-en">Aurora (F - Cheerful)</option>
                        <option value="aura-2-electra-en">Electra (F - Professional)</option>
                        <option value="aura-2-hermes-en">Hermes (M - Professional)</option>
                        <option value="aura-2-jupiter-en">Jupiter (M - Knowledgeable)</option>
                      </>
                    )}
                  </select>
                  <button type="button" onClick={() => {
                    const sv = voiceList.find(v => v.voice_id === voice);
                    if (sv?.preview_url && audioRef.current) { audioRef.current.src = sv.preview_url; audioRef.current.play(); }
                    else alert("No preview available.");
                  }} style={{ padding: "11px 16px", borderRadius: 8, border: "1.5px solid #D1FAE5", background: "#F6FEFA", color: "#059669", fontWeight: 800, cursor: "pointer" }}>
                    ▶
                  </button>
                </div>
                <audio ref={audioRef} style={{ display: "none" }} />
              </div>
              <div style={{ borderTop: "1px solid #D1FAE5", paddingTop: "1.25rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "0.85rem", color: "#064E3B", marginBottom: 10 }}>📞 Call Forwarding</h3>
                <label style={lbl}>Transfer Number</label>
                <input type="tel" value={forwardingNumber} onChange={e => setForwardingNumber(e.target.value)}
                  placeholder="+12125550199" style={inp} />
              </div>
            </div>
          </div>

          {/* Right: Telephony */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: 0 }}>Incoming Calls</h2>
              {agent.phone_number
                ? <span style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #D1FAE5", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>● Live</span>
                : <span style={{ background: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>⚠ No Number</span>}
            </div>
            {agent.phone_number ? (
              <>
                <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 12, padding: "1.5rem", textAlign: "center", marginBottom: "1.75rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, marginBottom: 6 }}>YOUR AI PHONE NUMBER</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#064E3B", letterSpacing: 2, fontFamily: "monospace" }}>{agent.phone_number}</div>
                </div>
                {[["📱 Option A — Direct Line", "Use this number directly in your marketing — put it on your website, Google My Business, or ads."],
                  ["🔄 Option B — Call Forwarding", "Keep your existing number. Forward missed calls to your AI so no lead is ever lost."]
                ].map(([title, desc]) => (
                  <div key={title} style={{ marginBottom: "1rem", padding: "1.25rem", background: "#F6FEFA", borderRadius: 12, border: "1px solid #D1FAE5" }}>
                    <h3 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#064E3B", marginBottom: 6 }}>{title}</h3>
                    <p style={{ color: "#6B7280", fontSize: "0.85rem", margin: 0 }}>{desc}</p>
                  </div>
                ))}
              </>
            ) : provisioning ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="Area code (e.g. 212)" style={{ ...inp, flex: 1 }} />
                  <button onClick={searchNumbers} disabled={provLoading} style={btn()}>{provLoading ? "..." : "Search"}</button>
                </div>
                {provError && <div style={{ color: "#DC2626", fontSize: "0.75rem" }}>{provError}</div>}
                {availableNumbers.map(n => (
                  <div key={n.phone_number} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: "#064E3B" }}>{n.phone_number}</div>
                    <button onClick={() => claimNumber(n.phone_number)} disabled={provLoading} style={btn("#10B981", { padding: "6px 12px", fontSize: "0.75rem" })}>Claim</button>
                  </div>
                ))}
                <button onClick={() => setProvisioning(false)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}>Cancel</button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📞</div>
                <p style={{ color: "#9CA3AF", marginBottom: "1.5rem", fontSize: "0.88rem" }}>No phone number yet.</p>
                <button onClick={() => setProvisioning(true)} style={btn()}>Provision a Number</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KNOWLEDGE BASE TAB ── */}
      {tab === "kb" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Left: Add content */}
          <div style={card()}>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: "1.25rem" }}>Add Knowledge</h2>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {(["text", "file", "url"] as const).map(t => (
                <button key={t} onClick={() => setKbTab(t)} style={{
                  padding: "6px 14px", borderRadius: 7, fontWeight: 700, fontSize: "0.8rem",
                  cursor: "pointer", border: "1.5px solid #D1FAE5",
                  background: kbTab === t ? "#064E3B" : "#F6FEFA",
                  color: kbTab === t ? "#fff" : "#059669",
                }}>
                  {t === "text" ? "✏️ Text" : t === "file" ? "📄 File" : "🌐 URL"}
                </button>
              ))}
            </div>

            {kbTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={lbl}>Paste your business content</label>
                <textarea rows={10} value={kbText} onChange={e => setKbText(e.target.value)}
                  placeholder="Paste FAQs, product descriptions, policies, pricing..."
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <button onClick={ingestText} disabled={kbBusy || !kbText.trim()} style={btn("#064E3B", { opacity: kbBusy ? 0.6 : 1 })}>
                  {kbBusy ? "Uploading..." : "Upload Text"}
                </button>
              </div>
            )}

            {kbTab === "file" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={lbl}>Upload a .txt or .md file</label>
                <div style={{ border: "2px dashed #D1FAE5", borderRadius: 10, padding: "2rem", textAlign: "center", cursor: "pointer", background: "#F6FEFA" }}
                  onClick={() => document.getElementById("kb-file-input")?.click()}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                  <div style={{ color: "#6B7280", fontSize: "0.85rem" }}>
                    {kbFile ? kbFile.name : "Click to select a file (.txt, .md)"}
                  </div>
                  <input id="kb-file-input" type="file" accept=".txt,.md" style={{ display: "none" }}
                    onChange={e => setKbFile(e.target.files?.[0] || null)} />
                </div>
                <button onClick={ingestFile} disabled={kbBusy || !kbFile} style={btn("#064E3B", { opacity: kbBusy || !kbFile ? 0.6 : 1 })}>
                  {kbBusy ? "Uploading..." : "Upload File"}
                </button>
              </div>
            )}

            {kbTab === "url" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={lbl}>Website URL to scrape</label>
                <input value={kbUrl} onChange={e => setKbUrl(e.target.value)}
                  placeholder="https://yoursite.com/faq" style={inp} />
                <p style={{ fontSize: "0.75rem", color: "#9CA3AF", margin: 0 }}>We'll scrape up to 5 pages and extract the text.</p>
                <button onClick={ingestUrl} disabled={kbBusy || !kbUrl.trim()} style={btn("#064E3B", { opacity: kbBusy || !kbUrl.trim() ? 0.6 : 1 })}>
                  {kbBusy ? "Syncing..." : "Sync URL"}
                </button>
              </div>
            )}

            {kbStatus && (
              <div style={{ marginTop: "1rem", padding: "10px 14px", borderRadius: 9,
                background: kbStatus.startsWith("✓") ? "#ECFDF5" : "#FEF2F2",
                color: kbStatus.startsWith("✓") ? "#059669" : "#DC2626",
                fontSize: "0.85rem", fontWeight: 700 }}>
                {kbStatus}
              </div>
            )}
          </div>

          {/* Right: Current sources */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: 0 }}>
                Ingested Content
                {kbTotal > 0 && <span style={{ marginLeft: 8, background: "#ECFDF5", color: "#059669", borderRadius: 99, padding: "2px 10px", fontSize: "0.75rem" }}>{kbTotal} chunks</span>}
              </h2>
              {kbTotal > 0 && (
                <button onClick={clearKb} disabled={kbBusy} style={{ background: "none", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 7, padding: "5px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                  Clear All
                </button>
              )}
            </div>

            {kbLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>Loading...</div>
            ) : kbSources.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                <p style={{ color: "#9CA3AF", fontSize: "0.88rem" }}>No knowledge base content yet. Add text, upload a file, or sync a URL to get started.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {kbSources.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#064E3B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.source.startsWith("http") ? "🌐 " : s.source === "manual" ? "✏️ " : "📄 "}{s.source}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 2 }}>
                        {new Date(s.created_at).toLocaleDateString()} · {s.chunks} chunk{s.chunks !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "1.5rem", padding: "12px 16px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #D1FAE5" }}>
              <div style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 700, marginBottom: 4 }}>💡 How it works</div>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", lineHeight: 1.6 }}>
                When a caller asks a question, the AI searches your knowledge base using semantic similarity and injects the most relevant content into its context before responding.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
