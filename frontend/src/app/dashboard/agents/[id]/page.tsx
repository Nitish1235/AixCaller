"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchVoices, fetchAgents, updateAgent, apiPost, API_BASE_URL, getTenantId } from "@/lib/api";

// Removed top-level TENANT_ID constant as it can be stale during client navigation.

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  border: "1.5px solid var(--border)", fontSize: "0.9rem", color: "var(--text)",
  outline: "none", fontFamily: "inherit", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5,
};
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)", padding: "1.75rem", ...extra,
});
const btn = (c = "var(--blue)", extra?: React.CSSProperties): React.CSSProperties => ({
  background: c, color: "#fff", border: "none", borderRadius: 9,
  padding: "10px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", ...extra,
});

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
  const [saveError, setSaveError] = useState("");
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
  const [shopifyMode, setShopifyMode] = useState<"oauth" | "direct">("oauth");
  const [directToken, setDirectToken] = useState("");
  const [testOrderNum, setTestOrderNum] = useState("");
  const [testOrderBusy, setTestOrderBusy] = useState(false);
  const [testOrderResult, setTestOrderResult] = useState<any>(null);

  // Custom URL / Webhook state
  const [customApiEnabled, setCustomApiEnabled] = useState(false);
  const [customApiEndpoint, setCustomApiEndpoint] = useState("");
  const [customApiMethod, setCustomApiMethod] = useState<"GET" | "POST">("GET");
  const [customApiAuth, setCustomApiAuth] = useState("");
  const [customApiDesc, setCustomApiDesc] = useState("");
  const [customApiSaving, setCustomApiSaving] = useState(false);
  const [customApiMsg, setCustomApiMsg] = useState("");

  // Telephony
  const [provisioning, setProvisioning] = useState(false);
  const [countryCode, setCountryCode] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [provError, setProvError] = useState("");

  // Legacy number forwarding
  const [legacyNumber, setLegacyNumber]             = useState("");
  const [legacySaving, setLegacySaving]             = useState(false);
  const [legacySaveMsg, setLegacySaveMsg]           = useState("");
  const [legacyTestBusy, setLegacyTestBusy]         = useState(false);
  const [legacyTestMsg, setLegacyTestMsg]           = useState("");
  const [showForwardingInstr, setShowForwardingInstr] = useState(false);

  // Tab
  const [tab, setTab] = useState<"settings" | "kb">("settings");

  // KB state
  const [kbSources, setKbSources] = useState<any[]>([]);
  const [kbTotal, setKbTotal] = useState(0);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbTab, setKbTab] = useState<"text" | "file" | "sheet" | "url">("text");
  const [kbText, setKbText] = useState("");
  const [kbUrl, setKbUrl] = useState("");
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [kbSheetId, setKbSheetId] = useState("");
  const [kbSheetName, setKbSheetName] = useState("Sheet1");
  const [kbStatus, setKbStatus] = useState("");
  const [kbBusy, setKbBusy] = useState(false);

  useEffect(() => {
    fetchVoices().then(d => { if (Array.isArray(d) && d.length > 0) setVoiceList(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      const tid = getTenantId();
      try {
        const list = await fetchAgents(tid);
        const found = list.find((a: any) => a.id === agentId);
        if (found) {
          setAgent(found);
          setName(found.name);
          setPrompt(found.system_prompt || "");
          setVoice(found.voice_id || "Telnyx.Ultra.a4a16c5e-5902-4732-b9b6-2a48efd2e11b");
          setForwardingNumber(found.forwarding_number || "");
          setTransferEnabled(!!found.human_transfer_enabled);
          setLegacyNumber(found.legacy_number || "");
          // Detect browser timezone for first-time users
          const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          setTransferTz(found.human_transfer_timezone || browserTz);
          const savedHours = found.human_transfer_hours;
          if (savedHours && Object.keys(savedHours).length > 0) {
            setTransferHours({ ...DEFAULT_HOURS, ...savedHours });
          }
          const ca = found.tools_config?.custom_api;
          if (ca) {
            setCustomApiEnabled(true);
            setCustomApiEndpoint(ca.endpoint || "");
            setCustomApiMethod((ca.method || "GET") as "GET" | "POST");
            setCustomApiAuth(ca.auth_header || "");
            setCustomApiDesc(ca.description || "");
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
    setSaving(true); setSaveError("");
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
    } catch (e: any) { setSaveError(e.message || "Failed to save changes."); }
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

  // ── Legacy Number Forwarding ───────────────────────────────────────────────
  const saveLegacyNumber = async () => {
    setLegacySaving(true); setLegacySaveMsg("");
    try {
      await updateAgent(agentId, { legacy_number: legacyNumber.trim() || null });
      // Sync local agent state so the test-call button works immediately
      setAgent((prev: any) => ({ ...prev, legacy_number: legacyNumber.trim() || null }));
      setLegacySaveMsg("✓ Saved");
    } catch {
      setLegacySaveMsg("✗ Failed to save");
    }
    setLegacySaving(false);
    setTimeout(() => setLegacySaveMsg(""), 3000);
  };

  const sendForwardingTestCall = async () => {
    setLegacyTestBusy(true); setLegacyTestMsg("");
    const tid = getTenantId();
    try {
      await apiPost("/numbers/test-forwarding", { agent_id: agentId, tenant_id: tid });
      setLegacyTestMsg(
        `📞 Test call sent to ${legacyNumber}. ` +
        "If forwarding is active, your AI agent will answer. " +
        "If not, you'll hear a setup reminder."
      );
    } catch (e: any) {
      setLegacyTestMsg("✗ Could not place test call. Check Telnyx configuration.");
    }
    setLegacyTestBusy(false);
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

  const ingestGoogleSheet = async () => {
    if (!kbSheetId.trim()) return;
    setKbBusy(true); setKbStatus("");
    try {
      const res = await fetch(`${API_BASE_URL}/kb/sync-google-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          sheet_id: kbSheetId.trim(),
          sheet_name: kbSheetName.trim() || "Sheet1"
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setKbStatus(`✓ Synced successfully! Ingested ${data.rows_processed} rows as ${data.chunks_stored} knowledge chunks.`);
      setKbSheetId("");
      loadKb();
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
    setProvLoading(true); setProvError(""); setAvailableNumbers([]);
    try {
      const data = await apiPost("/numbers/search", { country_code: countryCode, area_code: areaCode, limit: 5 });
      if (data.numbers?.length > 0) setAvailableNumbers(data.numbers);
      else setProvError(`No numbers found for ${countryCode}${areaCode ? ` area code ${areaCode}` : ""}. Try a different area code or country.`);
    } catch (e: any) { setProvError(e.message || "Failed to search numbers."); }
    setProvLoading(false);
  };

  const claimNumber = async (phone: string) => {
    setProvLoading(true); setProvError("");
    const tid = getTenantId();
    try {
      await apiPost("/numbers/purchase", { phone_number: phone, tenant_id: tid, agent_id: id });
      const list = await fetchAgents(tid);
      const updated = list.find((a: any) => a.id === id);
      if (updated) setAgent(updated);
      setProvisioning(false);
    } catch (e: any) { setProvError(e.message || "Failed to purchase number."); }
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

  const connectShopifyDirect = async () => {
    if (!shopInput.trim() || !directToken.trim()) {
      setShopifyMsg("Please enter both your store URL and access token.");
      return;
    }
    setShopifyBusy(true); setShopifyMsg("");
    try {
      const params = new URLSearchParams({
        agent_id: agentId,
        store_url: shopInput.trim(),
        access_token: directToken.trim(),
      });
      const res = await fetch(`${API_BASE_URL}/shopify/connect-direct?${params}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setShopifyMsg(`✓ ${data.message}`);
        loadShopifyStatus();
        setDirectToken("");
      } else {
        setShopifyMsg(`✗ ${data.detail || data.message || "Connection failed"}`);
      }
    } catch { setShopifyMsg("✗ Connection failed."); }
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

  const testOrder = async () => {
    if (!testOrderNum.trim()) return;
    setTestOrderBusy(true); setTestOrderResult(null);
    try {
      const params = new URLSearchParams({ agent_id: agentId, order_number: testOrderNum.trim() });
      const res = await fetch(`${API_BASE_URL}/shopify/test-order?${params}`);
      const data = await res.json();
      setTestOrderResult(data);
    } catch { setTestOrderResult({ ok: false, message: "Request failed. Check your connection." }); }
    setTestOrderBusy(false);
  };

  // ── Custom URL / Webhook ────────────────────────────────────────────────
  const saveCustomApi = async () => {
    setCustomApiSaving(true); setCustomApiMsg("");
    try {
      const existing = agent.tools_config || {};
      let tools_config: Record<string, any>;
      if (!customApiEnabled) {
        const { custom_api: _removed, ...rest } = existing;
        tools_config = rest;
      } else {
        if (!customApiEndpoint.trim()) {
          setCustomApiMsg("✗ Endpoint URL is required.");
          setCustomApiSaving(false);
          return;
        }
        tools_config = {
          ...existing,
          custom_api: {
            endpoint: customApiEndpoint.trim(),
            method: customApiMethod,
            auth_header: customApiAuth.trim(),
            description: customApiDesc.trim(),
          },
        };
      }
      await updateAgent(agentId, { tools_config });
      setCustomApiMsg(customApiEnabled ? "✓ Custom URL saved." : "✓ Custom URL disabled.");
    } catch { setCustomApiMsg("✗ Failed to save."); }
    setCustomApiSaving(false);
  };

  if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Loading...</div>;
  if (!agent) return <div style={{ padding: "4rem", textAlign: "center", color: "#9CA3AF" }}>Agent not found.</div>;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem",
    cursor: "pointer", border: "none",
    background: active ? "var(--blue)" : "var(--blue-light)",
    color: active ? "#fff" : "var(--blue)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard/agents")}
            style={{ background: "var(--blue-light)", border: "1.5px solid var(--border)", borderRadius: 9, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem", color: "var(--blue)" }}>←</button>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: "1.5rem", color: "var(--text)", margin: 0 }}>{agent.name}</h1>
            <p style={{ color: "var(--text-muted)", margin: "2px 0 0", fontSize: "0.85rem" }}>Configure behaviour and knowledge.</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {saved && <span style={{ fontSize: "0.82rem", color: "var(--blue)", fontWeight: 700 }}>✓ Saved!</span>}
            <button onClick={() => router.push(`/dashboard/call-flow?agent=${agent.id}`)} style={btn("var(--blue-light)", { color: "var(--blue)", border: "1.5px solid var(--border)" })}>
              Configure Call Flow →
            </button>
            <button onClick={save} disabled={saving} style={btn("var(--blue)", { opacity: saving ? 0.7 : 1 })}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {saveError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 14px", fontSize: "0.8rem", color: "#dc2626", fontWeight: 600, maxWidth: 400, textAlign: "right" }}>
              ⚠ {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={tabStyle(tab === "settings")} onClick={() => setTab("settings")}>⚙️ Settings</button>
        <button style={tabStyle(tab === "kb")} onClick={() => setTab("kb")}>
          📚 Knowledge Base {kbTotal > 0 && <span style={{ background: "var(--blue)", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: "0.7rem", marginLeft: 6 }}>{kbTotal}</span>}
        </button>
      </div>

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Left */}
          <div style={card()}>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: "1.5rem" }}>Agent Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={lbl}>Agent Name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>System Prompt</label>
                <textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>How your agent should behave and what it knows about your business.</p>
              </div>
              <div>
                <label style={lbl}>Voice</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select value={voice} onChange={e => setVoice(e.target.value)} style={{ ...inp, flex: 1 }}>
                    {voiceList.length > 0 ? voiceList.map(v => (
                      <option key={v.voice_id} value={v.voice_id}>{v.name} — {v.gender}</option>
                    )) : (
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
                      const sv = voiceList.find(v => v.voice_id === voice);
                      let url = sv?.preview_url;
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
              <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "1.5rem" }}>
                {/* Heading + master toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text)", margin: 0 }}>
                      🙋 Human Transfer to Live Agent
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0", lineHeight: 1.5, maxWidth: 480 }}>
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
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: transferEnabled ? "var(--blue)" : "var(--text-muted)" }}>
                      {transferEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </label>
                </div>

                {!transferEnabled && (
                  <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: 9, padding: "10px 14px", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 8 }}>
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
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 5, marginBottom: 0 }}>
                        E.164 format: <code style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 4, border: "1.5px solid var(--border)" }}>+12125550199</code> (with country code).
                      </p>
                    </div>

                    {/* Timezone */}
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>Timezone</label>
                      <select style={{ ...inp, cursor: "pointer" }} value={transferTz} onChange={e => setTransferTz(e.target.value)}>
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                        <option value="America/Chicago">Central Time (US & Canada)</option>
                        <option value="America/Denver">Mountain Time (US & Canada)</option>
                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                        <option value="Europe/London">UK Time (London)</option>
                        <option value="Europe/Paris">Central Europe (Paris/Berlin)</option>
                        <option value="Asia/Dubai">Gulf Standard Time (Dubai)</option>
                        <option value="Asia/Kolkata">India Standard Time (IST)</option>
                        <option value="Asia/Singapore">Singapore Time (SGT)</option>
                        <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                        <option value="Australia/Sydney">Australian Eastern (AEST)</option>
                      </select>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 5, marginBottom: 0 }}>
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
                              padding: "8px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                              background: "var(--blue-light)", color: "var(--blue)", fontWeight: 700, fontSize: "0.78rem",
                              cursor: "pointer", transition: "all 0.2s ease",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--blue)"}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Per-day editor */}
                    <div style={{ marginTop: 16 }}>
                      <label style={lbl}>Available Hours (when humans can take transfers)</label>
                      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                        {DAYS.map(d => (
                          <div key={d} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: d === "sun" ? "none" : "1px solid var(--border)" }}>
                            <div style={{ width: 44, fontWeight: 700, fontSize: "0.82rem", color: "var(--text)" }}>
                              {dayLabel(d)}
                            </div>
                            <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              {transferHours[d].length === 0 ? (
                                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                  Closed
                                </span>
                              ) : (
                                transferHours[d].map((win, idx) => (
                                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1.5px solid var(--border)", borderRadius: 7, padding: "2px 8px" }}>
                                    <input
                                      type="text"
                                      value={win}
                                      onChange={e => updateWindow(d, idx, e.target.value)}
                                      placeholder="09:00-18:00"
                                      style={{ width: 110, border: "none", outline: "none", fontSize: "0.82rem", color: "var(--blue)", fontFamily: "monospace", background: "transparent" }}
                                    />
                                    <button type="button" onClick={() => removeWindow(d, idx)}
                                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>
                                      ×
                                    </button>
                                  </div>
                                ))
                              )}
                              <button type="button" onClick={() => addWindow(d)}
                                style={{ background: "var(--blue-light)", border: "1.5px solid var(--border)", color: "var(--blue)", borderRadius: 7, padding: "2px 10px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
                        Standard format: <code style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 4 }}>HH:MM-HH:MM</code> (24-hour).
                        Add multiple windows per day for lunch breaks (e.g. <code style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 4 }}>09:00-12:00</code> + <code style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 4 }}>13:00-18:00</code>).
                        Remove all windows to mark a day as closed.
                      </p>
                    </div>

                    <div style={{ marginTop: 14, background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)", borderRadius: 9, padding: "10px 14px", fontSize: "0.78rem", color: "var(--blue)" }}>
                      💡 <strong>How it works:</strong> When a caller asks for a human <em>and</em> the current
                      time is inside one of these windows, the AI will say a brief "transferring you now" and
                      forward the call to your transfer number. Outside these hours, the AI politely says your
                      team isn't available and offers to help directly.
                    </div>
                  </>
                )}
              </div>



              {/* ── Shopify Integration ─────────────────────────────────── */}
              <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: "#96BF48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/shopify.svg" alt="Shopify" width={15} height={15} style={{ filter: "invert(1)" }} /></div>
                      Shopify Integration
                      {shopifyStatus?.connected && (
                        <span style={{ fontSize: "0.65rem", padding: "2px 8px", background: "var(--green-light)", color: "var(--green)", borderRadius: 99, fontWeight: 700, letterSpacing: 0.5 }}>
                          CONNECTED
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0", lineHeight: 1.5 }}>
                      Connect your Shopify store so the AI can answer caller questions about their orders — status, tracking, items, totals, refunds — in real-time.
                    </p>
                  </div>
                </div>

                {!shopifyStatus?.connected ? (
                  <>
                    {/* Mode toggle */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={() => setShopifyMode("oauth")}
                        style={{
                          padding: "5px 14px", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem",
                          border: "1.5px solid", cursor: "pointer",
                          background: shopifyMode === "oauth" ? "var(--blue)" : "#fff",
                          color: shopifyMode === "oauth" ? "#fff" : "var(--blue)",
                          borderColor: "var(--blue)",
                        }}
                      >
                        OAuth (Public App)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShopifyMode("direct")}
                        style={{
                          padding: "5px 14px", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem",
                          border: "1.5px solid", cursor: "pointer",
                          background: shopifyMode === "direct" ? "var(--blue)" : "#fff",
                          color: shopifyMode === "direct" ? "#fff" : "var(--blue)",
                          borderColor: "var(--blue)",
                        }}
                      >
                        Custom App Token
                      </button>
                    </div>

                    <label style={lbl}>Your Shopify Store URL</label>
                    <input
                      type="text"
                      value={shopInput}
                      onChange={e => setShopInput(e.target.value)}
                      placeholder="mystore.myshopify.com"
                      style={inp}
                    />

                    {shopifyMode === "oauth" ? (
                      <>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "5px 0 14px" }}>
                          You'll be redirected to Shopify to approve access.
                        </p>
                        <button
                          type="button"
                          onClick={connectShopify}
                          disabled={!shopInput.trim() || shopifyBusy}
                          style={{
                            background: "var(--blue)", color: "#fff", border: "none", borderRadius: 10,
                            padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem",
                            cursor: shopInput.trim() ? "pointer" : "not-allowed",
                            opacity: shopInput.trim() ? 1 : 0.6,
                            display: "inline-flex", alignItems: "center", gap: 8,
                            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)",
                          }}
                        >
                          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/shopify.svg" alt="" width={16} height={16} style={{ filter: "invert(1)" }} /> Connect with Shopify
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "5px 0 10px" }}>
                          For dev stores or custom apps: create a legacy custom app in <em>Settings → Apps and sales channels → Develop apps</em>, then paste your <code style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 4 }}>shpat_…</code> token below.
                        </p>
                        <label style={{ ...lbl, marginTop: 6 }}>Access Token</label>
                        <input
                          type="password"
                          value={directToken}
                          onChange={e => setDirectToken(e.target.value)}
                          placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          style={{ ...inp, marginBottom: 14, fontFamily: "monospace" }}
                        />
                        <button
                          type="button"
                          onClick={connectShopifyDirect}
                          disabled={!shopInput.trim() || !directToken.trim() || shopifyBusy}
                          style={{
                            background: "var(--blue)", color: "#fff", border: "none", borderRadius: 10,
                            padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem",
                            cursor: (shopInput.trim() && directToken.trim()) ? "pointer" : "not-allowed",
                            opacity: (shopInput.trim() && directToken.trim()) ? 1 : 0.6,
                            display: "inline-flex", alignItems: "center", gap: 8,
                            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)",
                          }}
                        >
                          {shopifyBusy ? "Connecting…" : <><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/shopify.svg" alt="" width={16} height={16} style={{ filter: "invert(1)" }} /> Connect with Token</>}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                        Connected Store
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--blue)", fontFamily: "monospace" }}>
                        {shopifyStatus.store_url}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={testShopify}
                        disabled={shopifyBusy}
                        style={{ background: "#fff", border: "1.5px solid var(--border)", color: "var(--blue)", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
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

                    {/* ── Test Order Lookup ── */}
                    <div style={{ marginTop: 14, background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.15)", borderRadius: 10, padding: "14px" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--blue)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        🧪 Test Order Lookup
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          value={testOrderNum}
                          onChange={e => { setTestOrderNum(e.target.value); setTestOrderResult(null); }}
                          onKeyDown={e => e.key === "Enter" && testOrder()}
                          placeholder="e.g. 1001 or #1001"
                          style={{ ...inp, flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
                        />
                        <button
                          type="button"
                          onClick={testOrder}
                          disabled={testOrderBusy || !testOrderNum.trim()}
                          style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: testOrderNum.trim() ? "pointer" : "not-allowed", opacity: testOrderNum.trim() ? 1 : 0.6, whiteSpace: "nowrap" }}
                        >
                          {testOrderBusy ? "Fetching…" : "Fetch Order"}
                        </button>
                      </div>

                      {testOrderResult && (
                        <div style={{
                          marginTop: 10, borderRadius: 8, padding: "10px 14px",
                          background: testOrderResult.ok ? "var(--green-light)" : "#FEF2F2",
                          border: `1px solid ${testOrderResult.ok ? "rgba(5, 150, 105, 0.2)" : "#FECACA"}`,
                        }}>
                          {testOrderResult.ok ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontWeight: 700, color: "var(--green)", fontSize: "0.85rem" }}>✓ {testOrderResult.message}</div>
                              {testOrderResult.order && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginTop: 6 }}>
                                  {[
                                    ["Order", testOrderResult.order.name],
                                    ["Customer", testOrderResult.order.customer],
                                    ["Fulfillment", testOrderResult.order.fulfillment_status],
                                    ["Payment", testOrderResult.order.financial_status],
                                    ["Items", testOrderResult.order.item_count],
                                    ["Total", testOrderResult.order.total],
                                  ].map(([label, value]) => (
                                    <div key={label as string} style={{ fontSize: "0.78rem" }}>
                                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{label}: </span>
                                      <span style={{ color: "var(--text)", fontWeight: 700 }}>{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: "0.82rem" }}>✗ {testOrderResult.message}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {shopifyMsg && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: shopifyMsg.startsWith("✓") ? "var(--green-light)" : "#FEF2F2",
                    color: shopifyMsg.startsWith("✓") ? "var(--green)" : "#DC2626",
                    borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                  }}>
                    {shopifyMsg}
                  </div>
                )}

                <div style={{ marginTop: 14, background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.15)", borderRadius: 9, padding: "10px 14px", fontSize: "0.76rem", color: "var(--blue)", lineHeight: 1.6 }}>
                  💡 <strong>What callers can ask:</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: "1.1rem" }}>
                    <li>"What's the status of order #1042?"</li>
                    <li>"Where's my order? When will it arrive?"</li>
                    <li>"What did I order? How much did I pay?"</li>
                    <li>"Has my refund been processed?"</li>
                  </ul>
                </div>
              </div>

              {/* ── Custom URL / Webhook ──────────────────────────────────── */}
              <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      🔗 Custom URL / Webhook
                      {customApiEnabled && (
                        <span style={{ fontSize: "0.65rem", padding: "2px 8px", background: "var(--blue-light)", color: "var(--blue)", borderRadius: 99, fontWeight: 700, letterSpacing: 0.5 }}>
                          ENABLED
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0", lineHeight: 1.5 }}>
                      Connect any REST API or webhook. Your AI calls this endpoint mid-conversation to fetch live data — inventory, bookings, customer info, or any business logic.
                    </p>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      {customApiEnabled ? "On" : "Off"}
                    </span>
                    <div
                      onClick={() => setCustomApiEnabled(v => !v)}
                      style={{
                        width: 40, height: 22, borderRadius: 99, cursor: "pointer",
                        background: customApiEnabled ? "var(--blue)" : "#D1D5DB",
                        position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 3,
                        left: customApiEnabled ? 21 : 3,
                        width: 16, height: 16, borderRadius: "50%",
                        background: "#fff", transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                  </label>
                </div>

                {customApiEnabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={lbl}>Endpoint URL <span style={{ color: "#EF4444" }}>*</span></label>
                      <input
                        type="url"
                        value={customApiEndpoint}
                        onChange={e => setCustomApiEndpoint(e.target.value)}
                        placeholder="https://api.yourapp.com/data"
                        style={inp}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                      <div>
                        <label style={lbl}>HTTP Method</label>
                        <select
                          value={customApiMethod}
                          onChange={e => setCustomApiMethod(e.target.value as "GET" | "POST")}
                          style={{ ...inp, appearance: "none" }}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Auth Header <span style={{ fontWeight: 400, color: "var(--text-muted)", textTransform: "none" }}>(optional)</span></label>
                        <input
                          type="text"
                          value={customApiAuth}
                          onChange={e => setCustomApiAuth(e.target.value)}
                          placeholder="Bearer sk-your-api-key"
                          style={inp}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>AI Tool Description <span style={{ fontWeight: 400, color: "var(--text-muted)", textTransform: "none" }}>(tells AI when to call this)</span></label>
                      <textarea
                        value={customApiDesc}
                        onChange={e => setCustomApiDesc(e.target.value)}
                        placeholder="e.g. Searches the inventory database for product availability and pricing based on the caller's request."
                        rows={3}
                        style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
                      />
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                        This description is passed to the AI so it knows when and how to use your endpoint.
                      </p>
                    </div>

                    <div style={{ marginTop: 4, background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)", borderRadius: 9, padding: "10px 14px", fontSize: "0.76rem", color: "var(--blue)", lineHeight: 1.6 }}>
                      <strong>How it works:</strong> When a caller asks something your AI can't answer from its knowledge,
                      it sends a <code style={{ background: "var(--surface)", padding: "1px 4px", borderRadius: 4, border: "1.5px solid var(--border)" }}>query</code> parameter
                      to your endpoint and reads the response. GET requests use query params; POST requests send{" "}
                      <code style={{ background: "var(--surface)", padding: "1px 4px", borderRadius: 4, border: "1.5px solid var(--border)" }}>{`{"query": "..."}`}</code>.
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={saveCustomApi}
                    disabled={customApiSaving}
                    style={{
                      background: "var(--blue)", color: "#fff", border: "none", borderRadius: 9,
                      padding: "10px 22px", fontWeight: 700, fontSize: "0.88rem",
                      cursor: customApiSaving ? "not-allowed" : "pointer", opacity: customApiSaving ? 0.7 : 1,
                      boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)",
                    }}
                  >
                    {customApiSaving ? "Saving…" : "Save Custom URL"}
                  </button>
                  {customApiMsg && (
                    <span style={{
                      fontSize: "0.82rem", fontWeight: 600,
                      color: customApiMsg.startsWith("✓") ? "var(--green)" : "#DC2626",
                    }}>
                      {customApiMsg}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Right: Telephony */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: 0 }}>Incoming Calls</h2>
              {agent.phone_number
                ? <span style={{ background: "var(--green-light)", color: "var(--green)", border: "1px solid rgba(5, 150, 105, 0.2)", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>● Live</span>
                : <span style={{ background: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A", borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>⚠ No Number</span>}
            </div>
            {agent.phone_number ? (
              <>
                {/* ── Your AI Number ─────────────────────────────────────── */}
                <div style={{ background: "var(--blue-light)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", textAlign: "center", marginBottom: "1.75rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 6 }}>YOUR AI PHONE NUMBER</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--blue)", letterSpacing: 2, fontFamily: "monospace" }}>{agent.phone_number}</div>
                </div>

                {/* ── Option A ───────────────────────────────────────────── */}
                <div style={{ marginBottom: "1rem", padding: "1.25rem", background: "var(--surface)", borderRadius: 12, border: "1.5px solid var(--border)" }}>
                  <h3 style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--blue)", marginBottom: 6 }}>📱 Option A — Direct Line</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                    Use this number directly in your marketing — put it on your website, Google My Business, or ads.
                  </p>
                </div>

                {/* ── Option B — Keep Your Existing Number ───────────────── */}
                <div style={{ padding: "1.25rem", background: "var(--surface)", borderRadius: 12, border: "1.5px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--blue)", margin: 0 }}>
                        🔄 Option B — Keep Your Existing Number
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0", lineHeight: 1.5 }}>
                        Already have a number on your marketing? Tell your carrier to
                        forward it here — callers dial your old number and your AI answers.
                      </p>
                    </div>
                    {agent.legacy_number && (
                      <span style={{
                        flexShrink: 0, marginLeft: 10,
                        background: "var(--green-light)", color: "var(--green)",
                        borderRadius: 99, padding: "2px 10px",
                        fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.5,
                      }}>● CONFIGURED</span>
                    )}
                  </div>

                  {/* ── Legacy number input ──────────────────────────────── */}
                  <div style={{ marginTop: 12 }}>
                    <label style={lbl}>Your Legacy / Marketing Number</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="tel"
                        value={legacyNumber}
                        onChange={e => setLegacyNumber(e.target.value)}
                        placeholder="+12125550100"
                        style={{ ...inp, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={saveLegacyNumber}
                        disabled={legacySaving}
                        style={btn("var(--blue)", { whiteSpace: "nowrap", opacity: legacySaving ? 0.7 : 1, boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)" })}
                      >
                        {legacySaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {legacySaveMsg && (
                      <div style={{
                        marginTop: 6, fontSize: "0.78rem", fontWeight: 700,
                        color: legacySaveMsg.startsWith("✓") ? "var(--green)" : "#DC2626",
                      }}>{legacySaveMsg}</div>
                    )}
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 5, marginBottom: 0 }}>
                      E.164 format: <code style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 4, border: "1.5px solid var(--border)" }}>+12125550100</code>. This is the number you want to keep on billboards, ads, etc.
                    </p>
                  </div>

                  {/* ── Setup instructions ──────────────────────────────── */}
                  {legacyNumber.trim() && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowForwardingInstr(v => !v)}
                        style={{
                          marginTop: 14, width: "100%", textAlign: "left",
                          background: "#fff", border: "1.5px solid var(--border)",
                          borderRadius: 9, padding: "10px 14px",
                          fontWeight: 700, fontSize: "0.82rem", color: "var(--blue)",
                          cursor: "pointer", display: "flex", justifyContent: "space-between",
                        }}
                      >
                        <span>📋 How to set up forwarding on your carrier</span>
                        <span>{showForwardingInstr ? "▲" : "▼"}</span>
                      </button>

                      {showForwardingInstr && (
                        <div style={{
                          marginTop: 4, border: "1.5px solid var(--border)", borderRadius: 9,
                          background: "#fff", padding: "1rem 1.1rem",
                          fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.75,
                        }}>
                          {/* Forward-to number prominently shown */}
                          <div style={{
                            background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)",
                            borderRadius: 8, padding: "8px 12px", marginBottom: 14,
                          }}>
                            <span style={{ fontWeight: 700, color: "var(--blue)" }}>Forward ALL calls to: </span>
                            <code style={{
                              fontFamily: "monospace", fontWeight: 900,
                              fontSize: "1rem", color: "var(--blue)", letterSpacing: 1,
                            }}>{agent.phone_number}</code>
                          </div>

                          {/* Carrier instructions */}
                          {[
                            {
                              carrier: "📱 AT&T / T-Mobile / Verizon (mobile)",
                              steps: [
                                `Dial *72${agent.phone_number} and press Call — forwarding activates immediately.`,
                                "To cancel forwarding later, dial *73 and press Call.",
                              ],
                            },
                            {
                              carrier: "🏢 Business Landline / PBX",
                              steps: [
                                "Log in to your carrier's business portal.",
                                'Navigate to Phone Numbers → select your legacy number → Call Forwarding.',
                                `Set "Unconditional Forward To": ${agent.phone_number}`,
                                "Save and apply the change.",
                              ],
                            },
                            {
                              carrier: "🌐 VoIP / Twilio / RingCentral / Vonage",
                              steps: [
                                "Log in to your VoIP provider dashboard.",
                                "Find your number under Phone Numbers or Lines.",
                                `Set the "Forward to" or "SIP Forward" destination to: ${agent.phone_number}`,
                                "For Twilio: set the Voice webhook URL to forward calls or use TwiML Redirect.",
                              ],
                            },
                            {
                              carrier: "📞 Google Voice",
                              steps: [
                                "Open voice.google.com → Settings → Calls.",
                                'Enable "Forward to linked numbers" and add your AI number.',
                                `Add ${agent.phone_number} as a forwarding destination.`,
                              ],
                            },
                          ].map(({ carrier, steps }) => (
                            <div key={carrier} style={{ marginBottom: 14 }}>
                              <div style={{ fontWeight: 800, color: "var(--blue)", marginBottom: 5 }}>{carrier}</div>
                              <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
                                {steps.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
                              </ol>
                            </div>
                          ))}

                          <div style={{
                            marginTop: 8, background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)",
                            borderRadius: 8, padding: "8px 12px", fontSize: "0.75rem", color: "var(--blue)",
                          }}>
                            💡 Not sure which carrier you have? Search your carrier name + "unconditional call forwarding" for exact steps. Most carriers support it at no extra cost.
                          </div>
                        </div>
                      )}

                      {/* ── Test call button ─────────────────────────────── */}
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          type="button"
                          onClick={sendForwardingTestCall}
                          disabled={legacyTestBusy}
                          style={{
                            background: legacyTestBusy ? "var(--text-muted)" : "var(--blue)",
                            color: "#fff", border: "none", borderRadius: 9,
                            padding: "10px 18px", fontWeight: 700, fontSize: "0.85rem",
                            cursor: legacyTestBusy ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 8,
                            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)",
                          }}
                        >
                          {legacyTestBusy ? "Placing test call…" : "📞 Send Test Call to Legacy Number"}
                        </button>

                        {legacyTestMsg && (
                          <div style={{
                            padding: "10px 14px", borderRadius: 9, fontSize: "0.8rem", fontWeight: 600,
                            background: legacyTestMsg.startsWith("✗") ? "#FEF2F2" : "var(--green-light)",
                            color: legacyTestMsg.startsWith("✗") ? "#DC2626" : "var(--green)",
                            border: `1px solid ${legacyTestMsg.startsWith("✗") ? "#FECACA" : "rgba(5, 150, 105, 0.2)"}`,
                          }}>
                            {legacyTestMsg}
                          </div>
                        )}

                        <div style={{
                          background: "var(--blue-light)", border: "1px solid rgba(29, 78, 216, 0.2)",
                          borderRadius: 9, padding: "10px 14px", fontSize: "0.77rem",
                          color: "var(--blue)", lineHeight: 1.6,
                        }}>
                          <strong>How the test works:</strong><br />
                          We call your legacy number from {agent.phone_number}.<br />
                          ✅ <strong>Forwarding active</strong> — your AI agent picks up the call (it gets forwarded to this AI number).<br />
                          ⚠️ <strong>Forwarding not set up</strong> — you'll hear a recorded instruction on your legacy phone.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : provisioning ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={{ ...inp, width: 200 }}>
                    {SUPPORTED_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="Area code (optional)" style={{ ...inp, flex: 1 }} />
                  <button onClick={searchNumbers} disabled={provLoading} style={btn()}>{provLoading ? "..." : "Search"}</button>
                </div>
                {provError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 14px", fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>
                    ⚠ {provError}
                  </div>
                )}
                {availableNumbers.map(n => (
                  <div key={n.phone_number} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "var(--blue-light)", border: "1.5px solid var(--border)", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--blue)" }}>{n.phone_number}</div>
                    <button onClick={() => claimNumber(n.phone_number)} disabled={provLoading} style={btn("var(--blue)", { padding: "6px 12px", fontSize: "0.75rem" })}>Claim</button>
                  </div>
                ))}
                <button onClick={() => setProvisioning(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", transition: "var(--transition)" }}>Cancel</button>
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
            <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: "1.25rem" }}>Add Knowledge</h2>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {(["text", "file", "sheet"] as const).map(t => (
                <button key={t} onClick={() => setKbTab(t)} style={{
                  padding: "6px 14px", borderRadius: 7, fontWeight: 700, fontSize: "0.8rem",
                  cursor: "pointer", border: "1.5px solid var(--border)",
                  background: kbTab === t ? "var(--blue)" : "var(--blue-light)",
                  color: kbTab === t ? "#fff" : "var(--blue)",
                }}>
                  {t === "text" ? "✏️ Text" : t === "file" ? "📄 File" : "📊 Google Sheet"}
                </button>
              ))}
            </div>

            {/* Guide: what to upload */}
            <div style={{
              background: "linear-gradient(135deg, var(--surface), var(--blue-light))",
              border: "1px solid rgba(29, 78, 216, 0.15)", borderRadius: 10,
              padding: "0.9rem 1rem", marginBottom: "1rem",
            }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--blue)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
                💡 What to upload for the best agent answers
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text)", fontSize: "0.82rem", lineHeight: 1.7 }}>
                <li><strong>Business basics</strong> — name, address, phone, hours, location, parking</li>
                <li><strong>Products / services</strong> — what you offer, key features, who it's for</li>
                <li><strong>Pricing</strong> — plan names, prices, what's included, discounts</li>
                <li><strong>FAQs</strong> — common customer questions and your answers</li>
                <li><strong>Policies</strong> — returns, refunds, shipping, cancellation, privacy</li>
                <li><strong>Process flows</strong> — how to book, order, sign up, get support</li>
                <li><strong>Team / expertise</strong> — doctors, agents, specialties, languages spoken</li>
              </ul>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>
                Tip: Write in plain Q&amp;A or short bullets. Avoid PDFs of scanned forms — text only works best.
              </div>
            </div>

            {kbTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={lbl}>Paste your business content</label>
                <textarea rows={10} value={kbText} onChange={e => setKbText(e.target.value)}
                  placeholder={"Example:\n\nQ: What are your hours?\nA: We're open Monday to Saturday, 9 AM to 7 PM.\n\nQ: Where are you located?\nA: 123 Main Street, Jaipur, India.\n\nQ: What services do you offer?\nA: We provide AI customer support, voice agents, and automation tools."}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                <button onClick={ingestText} disabled={kbBusy || !kbText.trim()} style={btn("var(--blue)", { opacity: kbBusy ? 0.6 : 1, boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)" })}>
                  {kbBusy ? "Uploading..." : "Upload Text"}
                </button>
              </div>
            )}

            {kbTab === "file" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <label style={lbl}>Upload a .txt or .md file</label>
                <div style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "2rem", textAlign: "center", cursor: "pointer", background: "var(--blue-light)" }}
                  onClick={() => document.getElementById("kb-file-input")?.click()}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                  <div style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                    {kbFile ? kbFile.name : "Click to select a file (.txt or .md)"}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 4 }}>
                    Max 2MB. Use plain-text files — not PDFs.
                  </div>
                  <input id="kb-file-input" type="file" accept=".txt,.md" style={{ display: "none" }}
                    onChange={e => setKbFile(e.target.files?.[0] || null)} />
                </div>
                <button onClick={ingestFile} disabled={kbBusy || !kbFile} style={btn("var(--blue)", { opacity: kbBusy || !kbFile ? 0.6 : 1, boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)" })}>
                  {kbBusy ? "Uploading..." : "Upload File"}
                </button>
              </div>
            )}

            {kbTab === "sheet" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={lbl}>Google Spreadsheet ID</label>
                  <input
                    type="text"
                    value={kbSheetId}
                    onChange={e => setKbSheetId(e.target.value)}
                    placeholder="e.g. 1aBCDeFghIjKLmNoPQrsT..."
                    style={inp}
                  />
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Enter the long identifier code from your sheet's browser URL bar.
                  </p>
                </div>
                <div>
                  <label style={lbl}>Sheet Tab Name</label>
                  <input
                    type="text"
                    value={kbSheetName}
                    onChange={e => setKbSheetName(e.target.value)}
                    placeholder="Sheet1"
                    style={inp}
                  />
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                    The tab name at the bottom of your Google Sheet. Defaults to 'Sheet1'.
                  </p>
                </div>
                <button
                  onClick={ingestGoogleSheet}
                  disabled={kbBusy || !kbSheetId.trim()}
                  style={btn("var(--blue)", { opacity: kbBusy || !kbSheetId.trim() ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)" })}
                >
                  {kbBusy ? "Syncing Google Sheet..." : "⚡ Sync Google Sheet Knowledge"}
                </button>
              </div>
            )}

            {kbStatus && (
              <div style={{ marginTop: "1rem", padding: "10px 14px", borderRadius: 9,
                background: kbStatus.startsWith("✓") ? "var(--green-light)" : "#FEF2F2",
                color: kbStatus.startsWith("✓") ? "var(--green)" : "#DC2626",
                fontSize: "0.85rem", fontWeight: 700 }}>
                {kbStatus}
              </div>
            )}
          </div>

          {/* Right: Current sources */}
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", margin: 0 }}>
                Ingested Content
                {kbTotal > 0 && <span style={{ marginLeft: 8, background: "var(--green-light)", color: "var(--green)", borderRadius: 99, padding: "2px 10px", fontSize: "0.75rem" }}>{kbTotal} chunks</span>}
              </h2>
              {kbTotal > 0 && (
                <button onClick={clearKb} disabled={kbBusy} style={{ background: "none", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 7, padding: "5px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                  Clear All
                </button>
              )}
            </div>

            {kbLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Loading...</div>
            ) : kbSources.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>No knowledge base content yet. Add text, upload a file, or sync a URL to get started.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {kbSources.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--blue-light)", border: "1.5px solid var(--border)", borderRadius: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--blue)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.source.startsWith("http") ? "🌐 " : s.source === "manual" ? "✏️ " : "📄 "}{s.source}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(s.created_at).toLocaleDateString()} · {s.chunks} chunk{s.chunks !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "1.5rem", padding: "12px 16px", background: "var(--blue-light)", borderRadius: 10, border: "1px solid rgba(29, 78, 216, 0.2)" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--blue)", fontWeight: 700, marginBottom: 4 }}>💡 How it works</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                When a caller asks a question, the AI searches your knowledge base using semantic similarity and injects the most relevant content into its context before responding.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
