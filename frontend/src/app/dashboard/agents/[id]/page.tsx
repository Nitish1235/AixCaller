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
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [transferTz, setTransferTz] = useState("UTC");
  // Each day → array of "HH:MM-HH:MM" strings. Empty = closed.
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  type DayKey = (typeof DAYS)[number];
  const DEFAULT_HOURS: Record<DayKey, string[]> = {
    mon: ["09:00-18:00"], tue: ["09:00-18:00"], wed: ["09:00-18:00"],
    thu: ["09:00-18:00"], fri: ["09:00-18:00"],
    sat: ["10:00-14:00"], sun: [],
  };
  const [transferHours, setTransferHours] = useState<Record<DayKey, string[]>>(DEFAULT_HOURS);

  // Shopify connection state
  const [shopifyStatus, setShopifyStatus] = useState<{ connected: boolean; store_url?: string | null } | null>(null);
  const [shopInput, setShopInput] = useState("");
  const [shopifyBusy, setShopifyBusy] = useState(false);
  const [shopifyMsg, setShopifyMsg] = useState<string>("");

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
  const [kbTab, setKbTab] = useState<"text" | "file">("text");
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
          setTransferEnabled(!!found.human_transfer_enabled);
          // Detect browser timezone for first-time users
          const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          setTransferTz(found.human_transfer_timezone || browserTz);
          const savedHours = found.human_transfer_hours;
          if (savedHours && Object.keys(savedHours).length > 0) {
            setTransferHours({ ...DEFAULT_HOURS, ...savedHours });
          }
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
      await updateAgent(id as string, {
        name,
        system_prompt: prompt,
        voice_id: voice,
        forwarding_number: forwardingNumber.trim() || null,
        human_transfer_enabled: transferEnabled,
        human_transfer_timezone: transferTz,
        human_transfer_hours: transferHours,
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // Helpers for the day-windows editor
  const dayLabel = (d: DayKey) => ({ mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" }[d]);
  const updateWindow = (d: DayKey, idx: number, value: string) => {
    setTransferHours(prev => ({
      ...prev,
      [d]: prev[d].map((w, i) => (i === idx ? value : w)),
    }));
  };
  const addWindow = (d: DayKey) => {
    setTransferHours(prev => ({ ...prev, [d]: [...prev[d], "09:00-17:00"] }));
  };
  const removeWindow = (d: DayKey, idx: number) => {
    setTransferHours(prev => ({ ...prev, [d]: prev[d].filter((_, i) => i !== idx) }));
  };
  const applyPreset = (preset: "default" | "weekdays" | "always") => {
    if (preset === "default") setTransferHours(DEFAULT_HOURS);
    else if (preset === "weekdays") setTransferHours({
      mon: ["09:00-18:00"], tue: ["09:00-18:00"], wed: ["09:00-18:00"],
      thu: ["09:00-18:00"], fri: ["09:00-18:00"], sat: [], sun: [],
    });
    else setTransferHours({
      mon: ["00:00-23:59"], tue: ["00:00-23:59"], wed: ["00:00-23:59"],
      thu: ["00:00-23:59"], fri: ["00:00-23:59"], sat: ["00:00-23:59"], sun: ["00:00-23:59"],
    });
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

  // ── Shopify ────────────────────────────────────────────────────────────
  const loadShopifyStatus = async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/shopify/status?agent_id=${agentId}`);
      if (res.ok) setShopifyStatus(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadShopifyStatus(); }, [agentId]);

  // Handle return-from-OAuth params (?shopify_connected=1 or ?shopify_error=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("shopify_connected") === "1") {
      setShopifyMsg("✓ Shopify connected successfully!");
      loadShopifyStatus();
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (p.get("shopify_error")) {
      setShopifyMsg(`✗ Shopify connection failed: ${p.get("shopify_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connectShopify = () => {
    if (!shopInput.trim()) { setShopifyMsg("Please enter your Shopify store URL first."); return; }
    // 302 redirect to backend which redirects to Shopify
    const url = `${API_BASE_URL}/shopify/install?agent_id=${agentId}&shop=${encodeURIComponent(shopInput.trim())}`;
    window.location.href = url;
  };

  const disconnectShopify = async () => {
    if (!confirm("Disconnect Shopify from this agent? The AI will no longer be able to look up orders.")) return;
    setShopifyBusy(true);
    try {
      await fetch(`${API_BASE_URL}/shopify/disconnect?agent_id=${agentId}`, { method: "DELETE" });
      setShopifyMsg("Shopify disconnected.");
      setShopifyStatus({ connected: false });
    } catch { setShopifyMsg("✗ Failed to disconnect."); }
    setShopifyBusy(false);
  };

  const testShopify = async () => {
    setShopifyBusy(true); setShopifyMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/shopify/test-connection?agent_id=${agentId}`, { method: "POST" });
      const data = await res.json();
      setShopifyMsg(data.ok ? `✓ ${data.message}` : `✗ ${data.message}`);
    } catch { setShopifyMsg("✗ Test failed."); }
    setShopifyBusy(false);
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
              <div style={{ borderTop: "1px solid #D1FAE5", paddingTop: "1.5rem" }}>
                {/* Heading + master toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: "0.92rem", color: "#064E3B", margin: 0 }}>
                      🙋 Human Transfer to Live Agent
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "#9CA3AF", margin: "4px 0 0", lineHeight: 1.5, maxWidth: 480 }}>
                      Optionally allow the AI to hand off the call to a real person on your team — only when they're available.
                    </p>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={transferEnabled}
                      onChange={e => setTransferEnabled(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: transferEnabled ? "#059669" : "#9CA3AF" }}>
                      {transferEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </label>
                </div>

                {!transferEnabled && (
                  <div style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB", borderRadius: 9, padding: "10px 14px", fontSize: "0.78rem", color: "#6B7280", marginTop: 8 }}>
                    Human transfer is <strong>off</strong>. The AI will politely decline if a caller asks to speak to a person.
                    Enable this if you want callers to be transferred to a real team member during your available hours.
                  </div>
                )}

                {transferEnabled && (
                  <>
                    {/* Transfer number */}
                    <div style={{ marginTop: 14 }}>
                      <label style={lbl}>Transfer Number (where to forward the caller)</label>
                      <input
                        type="tel"
                        value={forwardingNumber}
                        onChange={e => setForwardingNumber(e.target.value)}
                        placeholder="+12125550199"
                        style={inp}
                      />
                      <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 5, marginBottom: 0 }}>
                        E.164 format: <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>+12125550199</code> (with country code).
                      </p>
                    </div>

                    {/* Timezone */}
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>Timezone</label>
                      <select value={transferTz} onChange={e => setTransferTz(e.target.value)} style={inp}>
                        {[
                          "UTC",
                          "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
                          "Europe/London", "Europe/Berlin", "Europe/Paris",
                          "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
                          "Australia/Sydney",
                        ].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                      <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 5, marginBottom: 0 }}>
                        All hour windows below are interpreted in this timezone.
                      </p>
                    </div>

                    {/* Presets */}
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>Quick Presets (you can customize below)</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {([
                          ["default",  "Standard (Mon–Fri 9 AM–6 PM, Sat 10 AM–2 PM)"],
                          ["weekdays", "Weekdays Only (Mon–Fri 9 AM–6 PM)"],
                          ["always",   "Always Open (24/7)"],
                        ] as const).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => applyPreset(key as any)}
                            style={{
                              padding: "8px 14px", borderRadius: 8, border: "1.5px solid #D1FAE5",
                              background: "#F6FEFA", color: "#059669", fontWeight: 700, fontSize: "0.78rem",
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Per-day editor */}
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>Available Hours (when humans can take transfers)</label>
                      <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "0.75rem 1rem" }}>
                        {DAYS.map(d => (
                          <div key={d} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: d === "sun" ? "none" : "1px solid #F3F4F6" }}>
                            <div style={{ width: 44, fontWeight: 700, fontSize: "0.82rem", color: "#374151" }}>
                              {dayLabel(d)}
                            </div>
                            <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              {transferHours[d].length === 0 ? (
                                <span style={{ fontSize: "0.78rem", color: "#9CA3AF", fontStyle: "italic" }}>
                                  Closed
                                </span>
                              ) : (
                                transferHours[d].map((win, idx) => (
                                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #D1FAE5", borderRadius: 7, padding: "2px 8px" }}>
                                    <input
                                      type="text"
                                      value={win}
                                      onChange={e => updateWindow(d, idx, e.target.value)}
                                      placeholder="09:00-18:00"
                                      style={{ width: 110, border: "none", outline: "none", fontSize: "0.82rem", color: "#064E3B", fontFamily: "monospace", background: "transparent" }}
                                    />
                                    <button type="button" onClick={() => removeWindow(d, idx)}
                                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>
                                      ×
                                    </button>
                                  </div>
                                ))
                              )}
                              <button type="button" onClick={() => addWindow(d)}
                                style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", color: "#059669", borderRadius: 7, padding: "2px 10px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
                        Standard format: <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>HH:MM-HH:MM</code> (24-hour).
                        Add multiple windows per day for lunch breaks (e.g. <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>09:00-12:00</code> + <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>13:00-18:00</code>).
                        Remove all windows to mark a day as closed.
                      </p>
                    </div>

                    <div style={{ marginTop: 14, background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 9, padding: "10px 14px", fontSize: "0.78rem", color: "#064E3B" }}>
                      💡 <strong>How it works:</strong> When a caller asks for a human <em>and</em> the current
                      time is inside one of these windows, the AI will say a brief "transferring you now" and
                      forward the call to your transfer number. Outside these hours, the AI politely says your
                      team isn't available and offers to help directly.
                    </div>
                  </>
                )}
              </div>

              {/* ── Shopify Integration ─────────────────────────────────── */}
              <div style={{ borderTop: "1px solid #D1FAE5", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: "0.92rem", color: "#064E3B", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      🛍️ Shopify Integration
                      {shopifyStatus?.connected && (
                        <span style={{ fontSize: "0.65rem", padding: "2px 8px", background: "#D1FAE5", color: "#059669", borderRadius: 99, fontWeight: 700, letterSpacing: 0.5 }}>
                          CONNECTED
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "#9CA3AF", margin: "4px 0 0", lineHeight: 1.5 }}>
                      Connect your Shopify store so the AI can answer caller questions about their orders — status, tracking, items, totals, refunds — in real-time.
                    </p>
                  </div>
                </div>

                {!shopifyStatus?.connected ? (
                  <>
                    <label style={lbl}>Your Shopify Store URL</label>
                    <input
                      type="text"
                      value={shopInput}
                      onChange={e => setShopInput(e.target.value)}
                      placeholder="mystore.myshopify.com"
                      style={inp}
                    />
                    <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "5px 0 14px" }}>
                      Enter <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>yourstore.myshopify.com</code> (or just the handle).
                      You'll be redirected to Shopify to approve access.
                    </p>
                    <button
                      type="button"
                      onClick={connectShopify}
                      disabled={!shopInput.trim() || shopifyBusy}
                      style={{
                        background: "#96BF48", color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem", cursor: shopInput.trim() ? "pointer" : "not-allowed",
                        opacity: shopInput.trim() ? 1 : 0.6,
                        display: "inline-flex", alignItems: "center", gap: 8,
                      }}
                    >
                      🛍️ Connect with Shopify
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                        Connected Store
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#064E3B", fontFamily: "monospace" }}>
                        {shopifyStatus.store_url}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={testShopify}
                        disabled={shopifyBusy}
                        style={{ background: "#fff", border: "1.5px solid #D1FAE5", color: "#059669", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                      >
                        🔍 Test Connection
                      </button>
                      <button
                        type="button"
                        onClick={disconnectShopify}
                        disabled={shopifyBusy}
                        style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                )}

                {shopifyMsg && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: shopifyMsg.startsWith("✓") ? "#ECFDF5" : "#FEF2F2",
                    color: shopifyMsg.startsWith("✓") ? "#059669" : "#DC2626",
                    borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                  }}>
                    {shopifyMsg}
                  </div>
                )}

                <div style={{ marginTop: 14, background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 9, padding: "10px 14px", fontSize: "0.76rem", color: "#064E3B", lineHeight: 1.6 }}>
                  💡 <strong>What callers can ask:</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: "1.1rem" }}>
                    <li>"What's the status of order #1042?"</li>
                    <li>"Where's my order? When will it arrive?"</li>
                    <li>"What did I order? How much did I pay?"</li>
                    <li>"Has my refund been processed?"</li>
                  </ul>
                </div>
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

            {/* Sub-tabs — URL sync hidden for now, coming back soon */}
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {(["text", "file"] as const).map(t => (
                <button key={t} onClick={() => setKbTab(t)} style={{
                  padding: "6px 14px", borderRadius: 7, fontWeight: 700, fontSize: "0.8rem",
                  cursor: "pointer", border: "1.5px solid #D1FAE5",
                  background: kbTab === t ? "#064E3B" : "#F6FEFA",
                  color: kbTab === t ? "#fff" : "#059669",
                }}>
                  {t === "text" ? "✏️ Text" : "📄 File"}
                </button>
              ))}
              <span style={{
                padding: "6px 12px", borderRadius: 7, fontWeight: 600, fontSize: "0.75rem",
                background: "#F3F4F6", color: "#9CA3AF",
                border: "1px dashed #E5E7EB", display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                🌐 Website Sync — coming soon
              </span>
            </div>

            {/* Guide: what to upload */}
            <div style={{
              background: "linear-gradient(135deg,#F6FEFA,#ECFDF5)",
              border: "1px solid #D1FAE5", borderRadius: 10,
              padding: "0.9rem 1rem", marginBottom: "1rem",
            }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#059669", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
                💡 What to upload for the best agent answers
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#374151", fontSize: "0.82rem", lineHeight: 1.7 }}>
                <li><strong>Business basics</strong> — name, address, phone, hours, location, parking</li>
                <li><strong>Products / services</strong> — what you offer, key features, who it's for</li>
                <li><strong>Pricing</strong> — plan names, prices, what's included, discounts</li>
                <li><strong>FAQs</strong> — common customer questions and your answers</li>
                <li><strong>Policies</strong> — returns, refunds, shipping, cancellation, privacy</li>
                <li><strong>Process flows</strong> — how to book, order, sign up, get support</li>
                <li><strong>Team / expertise</strong> — doctors, agents, specialties, languages spoken</li>
              </ul>
              <div style={{ fontSize: "0.74rem", color: "#6B7280", marginTop: 8, fontStyle: "italic" }}>
                Tip: Write in plain Q&amp;A or short bullets. Avoid PDFs of scanned forms — text only works best.
              </div>
            </div>

            {kbTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={lbl}>Paste your business content</label>
                <textarea rows={10} value={kbText} onChange={e => setKbText(e.target.value)}
                  placeholder={"Example:\n\nQ: What are your hours?\nA: We're open Monday to Saturday, 9 AM to 7 PM.\n\nQ: Where are you located?\nA: 123 Main Street, Jaipur, India.\n\nQ: What services do you offer?\nA: We provide AI customer support, voice agents, and automation tools."}
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
                    {kbFile ? kbFile.name : "Click to select a file (.txt or .md)"}
                  </div>
                  <div style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 4 }}>
                    Max 2MB. Use plain-text files — not PDFs.
                  </div>
                  <input id="kb-file-input" type="file" accept=".txt,.md" style={{ display: "none" }}
                    onChange={e => setKbFile(e.target.files?.[0] || null)} />
                </div>
                <button onClick={ingestFile} disabled={kbBusy || !kbFile} style={btn("#064E3B", { opacity: kbBusy || !kbFile ? 0.6 : 1 })}>
                  {kbBusy ? "Uploading..." : "Upload File"}
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
