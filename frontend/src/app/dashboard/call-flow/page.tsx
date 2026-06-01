"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAgents, apiGet, apiPut, apiPost, apiPatch, getTenantId } from "@/lib/api";

/* ── Platform logo helper ──────────────────────────────────────── */
const CDN = "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons";
function PlatformLogo({ slug, alt, bg, size = 30 }: { slug?: string; alt: string; bg: string; size?: number; icon?: React.ReactNode }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {slug
        ? <img src={`${CDN}/${slug}.svg`} alt={alt} width={size * 0.58} height={size * 0.58} style={{ filter: "invert(1)" }} />
        : null}
    </div>
  );
}
function CustomLogo({ bg, size = 30, children }: { bg: string; size?: number; children: React.ReactNode }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
      {children}
    </div>
  );
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  shopify:         <PlatformLogo slug="shopify"         alt="Shopify"          bg="#96BF48" />,
  hubspot_sync:    <PlatformLogo slug="hubspot"         alt="HubSpot"          bg="#FF7A59" />,
  salesforce_sync: <PlatformLogo slug="salesforce"      alt="Salesforce"       bg="#00A1E0" />,
  airtable_log:    <PlatformLogo slug="airtable"        alt="Airtable"         bg="#18BFFF" />,
  google_calendar:    <PlatformLogo slug="googlecalendar"  alt="Google Calendar"  bg="#4285F4" />,
  google_sheets:      <PlatformLogo slug="googlesheets"    alt="Google Sheets"    bg="#0F9D58" />,
  google_sheet_kb:    <PlatformLogo slug="googlesheets"    alt="Sheets KB Search" bg="#0F9D58" />,
  google_sheet_slots: <PlatformLogo slug="googlesheets"    alt="Sheets Slots"     bg="#1a7340" />,
  email_summary: (
    <CustomLogo bg="#F59E0B">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
      </svg>
    </CustomLogo>
  ),
  webhook_post: (
    <CustomLogo bg="#7C3AED">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    </CustomLogo>
  ),
  custom_api: (
    <CustomLogo bg="#0891B2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    </CustomLogo>
  ),
  knowledge_base: (
    <CustomLogo bg="#2563EB">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    </CustomLogo>
  ),
  human_transfer: (
    <CustomLogo bg="#64748B">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </CustomLogo>
  ),
};

const containerStyle: React.CSSProperties = { display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", overflow: "hidden" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid var(--border)", background: "#fff" };
const mainLayout: React.CSSProperties = { display: "flex", flex: 1, overflow: "hidden", background: "#f9fafb" };
const timelinePane: React.CSSProperties = { flex: 1, overflowY: "auto", padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 };
const configPane: React.CSSProperties = { width: "420px", background: "#fff", borderLeft: "1px solid var(--border)", overflowY: "auto", display: "flex", flexDirection: "column" };

const btn = (c = "var(--blue)", extra?: React.CSSProperties): React.CSSProperties => ({
  background: c, color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px",
  fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", ...extra,
});
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid var(--border)",
  fontSize: "0.9rem", outline: "none", fontFamily: "inherit"
};

const defaultFlow = {
  pre_call: { business_hours: "always" },
  during_call: { tools: {
    knowledge_base:    { enabled: true  },
    human_transfer:    { enabled: false },
    google_calendar:   { enabled: false },
    google_sheet_kb:   { enabled: true  },
    google_sheet_slots:{ enabled: false },
    shopify:           { enabled: false },
    custom_api:        { enabled: false },
  }},
  post_call: {
    email_summary:   { enabled: true  },
    webhook_post:    { enabled: false },
    google_sheets:   { enabled: false },
    airtable_log:    { enabled: false },
    hubspot_sync:    { enabled: false },
    salesforce_sync: { enabled: false },
  }
};

export default function CallFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [agentId, setAgentId] = useState<string>(searchParams.get("agent") || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [callFlow, setCallFlow] = useState<any>(JSON.parse(JSON.stringify(defaultFlow)));
  const [integrations, setIntegrations] = useState<any>({});
  
  const [selectedItem, setSelectedItem] = useState<string>("overview"); // overview, shopify, airtable, etc.
  
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [testing, setTesting] = useState(false);

  const [savingInt, setSavingInt] = useState(false);
  const [intForm, setIntForm] = useState<any>({});

  // Sheet KB config state
  const [sheetKbDesc, setSheetKbDesc]         = useState("");
  const [sheetKbColumns, setSheetKbColumns]   = useState<string[]>([]);
  const [sheetKbAnalyzing, setSheetKbAnalyzing] = useState(false);
  const [sheetKbSaving, setSheetKbSaving]     = useState(false);
  const [sheetKbMsg, setSheetKbMsg]           = useState("");

  useEffect(() => {
    const loadAgents = async () => {
      const tid = getTenantId();
      if (tid) {
        try {
          const list = await fetchAgents(tid);
          setAgents(list);
          // Auto-select first agent only if none is pre-selected from URL
          if (!searchParams.get("agent") && list.length > 0 && !agentId) {
            setAgentId(list[0].id);
          }
        } catch (e) {
          console.error("Failed to fetch agents", e);
        } finally {
          setAgentsLoaded(true);
        }
      } else {
        setAgentsLoaded(true);
      }
    };
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!agentId) return;
    const loadFlow = async () => {
      setLoading(true);
      try {
        const res = await apiGet(`/agents/${agentId}/call-flow`);
        if (res.call_flow && Object.keys(res.call_flow).length > 0) {
          // Merge with defaults to ensure all keys exist
          setCallFlow({ ...defaultFlow, ...res.call_flow });
        } else {
          setCallFlow(JSON.parse(JSON.stringify(defaultFlow)));
        }
        setIntegrations(res.integrations || {});
        setIntForm({
          shopify_store_url: res.integrations?.shopify_domain || "",
          shopify_api_key: "",
          airtable_pat: "",
          airtable_base_id: res.integrations?.airtable_base_id || "",
          webhook_url: res.integrations?.webhook_url || ""
        });
        // Pre-fill Sheet KB config if already saved
        if (res.sheet_kb_config?.description) {
          setSheetKbDesc(res.sheet_kb_config.description);
          setSheetKbColumns(res.sheet_kb_config.columns || []);
        } else {
          setSheetKbDesc("");
          setSheetKbColumns([]);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadFlow();
    // Clear selections on agent change
    setSelectedItem("overview");
    setTestResult(null);
  }, [agentId]);

  const saveFlow = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await apiPut(`/agents/${agentId}/call-flow`, { call_flow: callFlow });
      alert("Call flow saved successfully!");
    } catch (e) {
      alert("Failed to save call flow.");
      console.error(e);
    }
    setSaving(false);
  };

  const testConnection = async (integration: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiPost(`/agents/${agentId}/call-flow/test`, { integration });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Test failed" });
    }
    setTesting(false);
  };

  // Helper to deep update callFlow
  const updateFlow = (path: string[], value: any) => {
    setCallFlow((prev: any) => {
      const nw = { ...prev };
      let curr = nw;
      for (let i = 0; i < path.length - 1; i++) {
        if (!curr[path[i]]) curr[path[i]] = {};
        curr = curr[path[i]];
      }
      curr[path[path.length - 1]] = value;
      return nw;
    });
  };

  const isToolEnabled = (tool: string, phase: string = "during_call") => {
    if (phase === "during_call") {
      return callFlow.during_call?.tools?.[tool]?.enabled || false;
    } else if (phase === "post_call") {
      return callFlow.post_call?.[tool]?.enabled || false;
    }
    return false;
  };

  const toggleTool = (tool: string, phase: string = "during_call") => {
    const current = isToolEnabled(tool, phase);
    if (phase === "during_call") {
      updateFlow(["during_call", "tools", tool, "enabled"], !current);
    } else {
      updateFlow(["post_call", tool, "enabled"], !current);
    }
  };

  // Returns true when the integration is ready to be enabled
  const isIntegrationReady = (id: string): boolean => {
    switch (id) {
      case "shopify":          return !!(integrations.shopify_connected || integrations.shopify_store_url);
      case "hubspot_sync":     return !!integrations.hubspot_connected;
      case "salesforce_sync":  return !!integrations.salesforce_connected;
      case "airtable_log":     return !!integrations.airtable_connected;
      case "webhook_post":     return !!integrations.webhook_url;
      case "google_calendar":    return !!integrations.google_connected;
      case "google_sheets":      return !!integrations.google_connected;
      case "google_sheet_kb":    return !!(integrations.google_connected && integrations.google_sheet_configured);
      case "google_sheet_slots": return !!(integrations.google_connected && integrations.google_sheet_configured);
      case "custom_api":         return !!integrations.custom_api_configured;
      // built-ins — no external account needed
      default:                 return true;
    }
  };

  const saveIntegration = async (fields: any) => {
    setSavingInt(true);
    try {
      const tid = getTenantId();
      await apiPatch(`/integrations?tenant_id=${tid}`, fields);
      alert("Integration saved successfully!");
      // Reload integrations
      const res = await apiGet(`/agents/${agentId}/call-flow`);
      setIntegrations(res.integrations || {});
    } catch (e) {
      alert("Failed to save integration.");
    }
    setSavingInt(false);
  };

  const renderTimelineCard = (title: string, subtitle: string, items: {id: string, label: string, phase: string}[]) => (
    <div style={{ width: 600, background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 4px", color: "var(--text)" }}>{title}</h2>
      <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: "0.9rem" }}>{subtitle}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map(item => {
          const enabled = isToolEnabled(item.id, item.phase);
          const ready = isIntegrationReady(item.id);
          const selected = selectedItem === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: 16,
                border: selected ? "2px solid var(--blue)" : !ready ? "1.5px dashed #f59e0b" : "1.5px solid var(--border)",
                borderRadius: 12, cursor: "pointer",
                background: selected ? "rgba(29, 78, 216, 0.04)" : !ready ? "#fffbeb" : "#fff",
                transition: "all 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ filter: (enabled && ready) ? "none" : "grayscale(100%) opacity(45%)", flexShrink: 0 }}>
                  {PLATFORM_ICONS[item.id]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: (enabled && ready) ? "var(--text)" : "var(--text-muted)", lineHeight: 1.2 }}>{item.label}</div>
                  {!ready && (
                    <div style={{ fontSize: "0.68rem", color: "#d97706", fontWeight: 700, marginTop: 2 }}>
                      ⚙ Connect first →
                    </div>
                  )}
                </div>
              </div>

              {/* Toggle — locked when not integrated */}
              <div
                title={!ready ? "Connect this integration first" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ready) {
                    // Open config panel so user can set it up
                    setSelectedItem(item.id);
                    return;
                  }
                  toggleTool(item.id, item.phase);
                }}
                style={{
                  width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                  background: (enabled && ready) ? "var(--blue)" : !ready ? "#fde68a" : "#e2e8f0",
                  position: "relative", cursor: !ready ? "not-allowed" : "pointer", transition: "0.2s",
                  border: !ready ? "1.5px solid #f59e0b" : "none",
                  display: "flex", alignItems: "center", justifyContent: ready ? "flex-start" : "center",
                }}
              >
                {!ready ? (
                  <span style={{ fontSize: "11px", lineHeight: 1 }}>🔒</span>
                ) : (
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 2, left: enabled ? 20 : 2, transition: "0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGuide = () => {
    switch(selectedItem) {
      case "shopify":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#96BF48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/shopify.svg`} width={22} height={22} alt="Shopify" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Shopify</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>E-commerce · Real-time order lookup</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 10 }}>
              Allow your AI agent to look up order status and product information in real-time.
            </p>
            
            <div style={{ background: "#f8fafc", padding: 15, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontSize: "0.85rem", color: "#475569" }}>
              <strong>How to connect:</strong>
              <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Go to Shopify Admin → Settings → Apps and sales channels</li>
                <li>Click <strong>Develop apps</strong> → Create an app (e.g. "AIxCaller")</li>
                <li>Go to Configuration → Admin API Integration → Configure</li>
                <li>Select <strong>read_orders</strong>, <strong>read_products</strong>, and <strong>read_customers</strong></li>
                <li>Click Install app, then copy the generated <code>shpat_...</code> token below.</li>
              </ol>
            </div>

            {integrations.shopify_connected && (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 20 }}>
                ✓ Connected to {integrations.shopify_domain}
              </div>
            )}
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 5 }}>Store URL (e.g. mystore.myshopify.com)</label>
              <input style={inp} value={intForm.shopify_store_url} onChange={e => setIntForm({...intForm, shopify_store_url: e.target.value})} placeholder="mystore.myshopify.com" />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 5 }}>Admin API Access Token (shpat_...)</label>
              <input type="password" style={inp} value={intForm.shopify_api_key} onChange={e => setIntForm({...intForm, shopify_api_key: e.target.value})} placeholder="shpat_xxxxxxxxxxxxxxxxx" />
            </div>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button 
                onClick={() => saveIntegration({ shopify_store_url: intForm.shopify_store_url, shopify_api_key: intForm.shopify_api_key })}
                disabled={savingInt}
                style={{ ...btn(), flex: 1 }}
              >
                {savingInt ? "Saving..." : "Save Credentials"}
              </button>
              <button 
                onClick={() => testConnection("shopify")} 
                disabled={testing || !integrations.shopify_connected}
                style={{ ...btn("#f1f5f9"), color: "#334155", flex: 1, border: "1px solid #cbd5e1" }}
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
            
            {testResult && (
              <div style={{ marginTop: 15, padding: 10, borderRadius: 8, fontSize: "0.85rem", background: testResult.success ? "#dcfce7" : "#fee2e2", color: testResult.success ? "#166534" : "#991b1b" }}>
                {testResult.message}
              </div>
            )}
          </div>
        );
      case "airtable":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#18BFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/airtable.svg`} width={22} height={22} alt="Airtable" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Airtable</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Database · Call log & transcripts</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 10 }}>
              Automatically log every completed call, transcript, and summary to an Airtable base.
            </p>

            <div style={{ background: "#f8fafc", padding: 15, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontSize: "0.85rem", color: "#475569" }}>
              <strong>How to connect:</strong>
              <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Go to <a href="https://airtable.com/create/tokens" target="_blank" style={{ color: "var(--blue)" }}>airtable.com/create/tokens</a></li>
                <li>Create a new token and add scopes: <code>data.records:read</code> and <code>data.records:write</code></li>
                <li>Under Access, select the Base you want to connect to.</li>
                <li>Copy the Token below. To find your Base ID, look at the URL of your Airtable base (it starts with <code>app...</code>).</li>
              </ol>
            </div>

            {integrations.airtable_connected && (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 20 }}>
                ✓ Airtable Connected
              </div>
            )}
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 5 }}>Base ID</label>
              <input style={inp} value={intForm.airtable_base_id} onChange={e => setIntForm({...intForm, airtable_base_id: e.target.value})} placeholder="appXXXXXXXXXXXXXX" />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 5 }}>Personal Access Token</label>
              <input type="password" style={inp} value={intForm.airtable_pat} onChange={e => setIntForm({...intForm, airtable_pat: e.target.value})} placeholder="patXXXXXXXXXXXXXX.xxxx..." />
            </div>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button 
                onClick={() => saveIntegration({ airtable_base_id: intForm.airtable_base_id, airtable_pat: intForm.airtable_pat })}
                disabled={savingInt}
                style={{ ...btn(), flex: 1 }}
              >
                {savingInt ? "Saving..." : "Save Credentials"}
              </button>
              <button 
                onClick={() => testConnection("airtable")} 
                disabled={testing || !integrations.airtable_connected}
                style={{ ...btn("#f1f5f9"), color: "#334155", flex: 1, border: "1px solid #cbd5e1" }}
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
            
            {testResult && (
              <div style={{ marginTop: 15, padding: 10, borderRadius: 8, fontSize: "0.85rem", background: testResult.success ? "#dcfce7" : "#fee2e2", color: testResult.success ? "#166534" : "#991b1b" }}>
                {testResult.message}
              </div>
            )}
          </div>
        );
      case "webhook_post":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Custom Webhook</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Zapier · Make · Any REST endpoint</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 10 }}>
              Send a POST request to a Zapier, Make, or custom URL after every call ends.
            </p>

            <div style={{ background: "#f8fafc", padding: 15, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontSize: "0.85rem", color: "#475569" }}>
              <strong>How to connect:</strong>
              <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Create a Catch Hook in Zapier or a Custom Webhook in Make.com.</li>
                <li>Copy the provided Webhook URL and paste it below.</li>
                <li>We will send a POST request containing the call transcript, summary, and sentiment analysis immediately after the call finishes.</li>
              </ul>
            </div>

            {integrations.webhook_connected && (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 20 }}>
                ✓ Webhook URL is set
              </div>
            )}
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 5 }}>Webhook URL</label>
              <input style={inp} value={intForm.webhook_url} onChange={e => setIntForm({...intForm, webhook_url: e.target.value})} placeholder="https://hooks.zapier.com/..." />
            </div>
            
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button 
                onClick={() => saveIntegration({ webhook_url: intForm.webhook_url })}
                disabled={savingInt}
                style={{ ...btn(), flex: 1 }}
              >
                {savingInt ? "Saving..." : "Save Webhook"}
              </button>
              <button 
                onClick={() => testConnection("webhook")} 
                disabled={testing || !integrations.webhook_connected}
                style={{ ...btn("#f1f5f9"), color: "#334155", flex: 1, border: "1px solid #cbd5e1" }}
              >
                {testing ? "Testing..." : "Send Test Webhook"}
              </button>
            </div>
            
            {testResult && (
              <div style={{ marginTop: 15, padding: 10, borderRadius: 8, fontSize: "0.85rem", background: testResult.success ? "#dcfce7" : "#fee2e2", color: testResult.success ? "#166534" : "#991b1b" }}>
                {testResult.message}
              </div>
            )}
          </div>
        );
      case "hubspot_sync":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FF7A59", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/hubspot.svg`} width={22} height={22} alt="HubSpot" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>HubSpot CRM</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CRM · Contacts & deal sync</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Log calls automatically to HubSpot Contacts.
            </p>
            {integrations.hubspot_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ HubSpot Connected — toggle it on in the card to activate
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Not connected</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>Connect HubSpot first to enable this step.</div>
                <a href="/dashboard/integrations" style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#FF7A59", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                  → Go to Integrations
                </a>
              </div>
            )}
          </div>
        );
      case "salesforce_sync":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#00A1E0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/salesforce.svg`} width={22} height={22} alt="Salesforce" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Salesforce</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CRM · Enterprise lead & contact sync</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Log calls automatically to Salesforce Leads/Contacts.
            </p>
            {integrations.salesforce_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ Salesforce Connected — toggle it on in the card to activate
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Not connected</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>Connect Salesforce first to enable this step.</div>
                <a href="/dashboard/integrations" style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#00A1E0", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                  → Go to Integrations
                </a>
              </div>
            )}
          </div>
        );
      case "google_sheet_kb":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0F9D58", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/googlesheets.svg`} width={22} height={22} alt="Sheets KB" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)" }}>Sheets KB Search</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Opt-in · only active when you configure it below</div>
              </div>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: "0.8rem", color: "#475569", lineHeight: 1.65 }}>
              <strong style={{ color: "#0f172a" }}>Sheets KB vs regular KB — when to use which:</strong>
              <ul style={{ margin: "5px 0 0 14px", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <li><strong>Regular KB</strong> — FAQs, policies, small product lists → upload as text/PDF</li>
                <li><strong>Sheets KB</strong> — large structured data (pricing tables, service menus, rosters) that lives in a spreadsheet and changes often</li>
              </ul>
            </div>

            {!integrations.google_sheet_configured ? (
              <div style={{ padding: 14, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.85rem" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ No Google Sheet connected yet</div>
                Add a Sheet ID in Agent Settings → Tools Config → <code>google_sheet</code> first.
                <a href={agentId ? `/dashboard/agents/${agentId}` : "/dashboard/agents"} style={{ display: "inline-block", marginTop: 10, padding: "7px 14px", background: "#f59e0b", color: "#fff", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", textDecoration: "none" }}>→ Open Agent Settings</a>
              </div>
            ) : (
              <>
                <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: "9px 14px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.8rem", color: "#0f172a" }}>
                    Step 1 — Detect your sheet's columns
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                      Reads only the first row. Fast, minimal quota. Auto-generates a search description you can edit.
                    </p>
                    <button
                      onClick={async () => {
                        setSheetKbAnalyzing(true); setSheetKbMsg("");
                        try {
                          const res = await apiPost(`/agents/${agentId}/sheet-kb/analyze`, {});
                          setSheetKbColumns(res.columns || []);
                          if (!sheetKbDesc) setSheetKbDesc(res.auto_description || "");
                          setSheetKbMsg("✓ Columns detected. Review the description below then save.");
                        } catch (e: any) { setSheetKbMsg(`✗ ${e.message || "Analysis failed"}`); }
                        setSheetKbAnalyzing(false);
                      }}
                      disabled={sheetKbAnalyzing}
                      style={{ background: "#0F9D58", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", opacity: sheetKbAnalyzing ? 0.7 : 1, alignSelf: "flex-start" }}
                    >
                      {sheetKbAnalyzing ? "Reading headers…" : "🔍 Analyze Sheet"}
                    </button>
                    {sheetKbColumns.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {sheetKbColumns.map(c => (
                          <span key={c} style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 99, padding: "2px 9px", fontSize: "0.72rem", fontWeight: 700 }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: "9px 14px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.8rem", color: "#0f172a" }}>
                    Step 2 — Tell the AI when to search this sheet
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                      This is the AI's <em>decision rule</em>. It calls <code>search_sheet_data</code> only when the caller's question matches. Leave blank to disable the tool entirely.
                    </p>
                    <textarea
                      rows={4}
                      value={sheetKbDesc}
                      onChange={e => setSheetKbDesc(e.target.value)}
                      placeholder={`e.g. "Contains our service menu with columns Service, Price, Duration. Search when callers ask about pricing, what services we offer, or how long a treatment takes."`}
                      style={{ ...inp, resize: "vertical", lineHeight: 1.55, fontSize: "0.82rem" }}
                    />
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Tip: be specific about the column names and question types — the AI uses this verbatim.</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={async () => {
                      setSheetKbSaving(true); setSheetKbMsg("");
                      try {
                        await apiPatch(`/agents/${agentId}/sheet-kb/config`, { description: sheetKbDesc, columns: sheetKbColumns, enabled: !!sheetKbDesc.trim() });
                        setSheetKbMsg(sheetKbDesc.trim() ? "✓ Saved — AI will search this sheet when relevant." : "✓ Cleared — tool disabled.");
                      } catch (e: any) { setSheetKbMsg(`✗ ${e.message || "Save failed"}`); }
                      setSheetKbSaving(false);
                    }}
                    disabled={sheetKbSaving}
                    style={{ background: "#0F9D58", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer", opacity: sheetKbSaving ? 0.7 : 1 }}
                  >
                    {sheetKbSaving ? "Saving…" : "💾 Save"}
                  </button>
                  {sheetKbDesc.trim() && (
                    <button
                      onClick={async () => {
                        if (!confirm("Disable Sheet KB? The AI will stop searching this sheet during calls.")) return;
                        try {
                          await apiPatch(`/agents/${agentId}/sheet-kb/config`, { description: "", columns: [], enabled: false });
                          setSheetKbDesc(""); setSheetKbColumns([]); setSheetKbMsg("✓ Disabled.");
                        } catch (e: any) { setSheetKbMsg(`✗ ${e.message || "Failed"}`); }
                      }}
                      style={{ background: "none", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 8, padding: "9px 12px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                    >Remove</button>
                  )}
                </div>
                {sheetKbMsg && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, background: sheetKbMsg.startsWith("✓") ? "#dcfce7" : "#fef2f2", color: sheetKbMsg.startsWith("✓") ? "#166534" : "#dc2626" }}>
                    {sheetKbMsg}
                  </div>
                )}
              </>
            )}
          </div>
        );
      case "google_sheet_slots":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1a7340", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/googlesheets.svg`} width={22} height={22} alt="Sheet Booking Slots" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Sheet Booking Slots</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Date/time slot availability · Google Calendar fallback</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
              When enabled, the AI checks your slots sheet for available times before committing to any booking. Falls back to Google Calendar FreeBusy if the sheet has no slot data for that date.
            </p>
            {integrations.google_sheet_configured ? (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 16 }}>
                ✓ Sheet connected — toggle on to activate slot checking during calls.
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ No sheet connected yet</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>Connect a Google Sheet in Agent Settings first. The sheet needs Date, Time, and Status columns.</div>
                <a href={agentId ? `/dashboard/agents/${agentId}` : "/dashboard/agents"} style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#1a7340", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>→ Open Agent Settings</a>
              </div>
            )}
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px", fontSize: "0.82rem", color: "#166534", lineHeight: 1.7, marginBottom: 12 }}>
              <strong>AI booking conversation flow:</strong>
              <ol style={{ margin: "8px 0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>AI asks: <em>"What date works best for you?"</em></li>
                <li>Caller names a date → AI calls <code>check_slot_availability</code></li>
                <li>Slots free → <em>"I have openings at 10:00, 14:00, 16:00. Which works?"</em></li>
                <li>Fully booked → AI offers the next available date automatically</li>
                <li>Caller picks time → AI collects name/phone → calls <code>book_appointment</code></li>
                <li>Confirms: <em>"You're all set for [date] at [time]!"</em></li>
              </ol>
            </div>
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", fontSize: "0.8rem", color: "#92400e", lineHeight: 1.6 }}>
              <strong>Required sheet columns (header row):</strong> <code>Date</code> (YYYY-MM-DD), <code>Time</code> (HH:MM), <code>Status</code> (leave blank = available, write "Booked" when taken). Additional columns are ignored.
            </div>
          </div>
        );
      case "google_calendar":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#4285F4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/googlecalendar.svg`} width={22} height={22} alt="Google Calendar" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Google Calendar</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Scheduling · Book appointments live during the call</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 16 }}>
              When enabled, the AI checks your Google Calendar availability in real-time and books appointments during the call — no back-and-forth required.
            </p>
            {integrations.google_connected ? (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 16 }}>
                ✓ Google Calendar connected — toggle it on in the card to activate booking during calls.
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Not connected</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>Connect your Google account first to enable calendar booking during calls.</div>
                <a href="/dashboard/integrations" style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#4285F4", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                  → Connect Google Calendar
                </a>
              </div>
            )}
            <div style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "#1e40af", lineHeight: 1.6 }}>
              💡 <strong>What the AI does:</strong> When a caller wants to schedule, the AI asks for a preferred date/time, checks your calendar for availability, and confirms the booking — all without putting the caller on hold.
            </div>
          </div>
        );
      case "custom_api":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0891B2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Custom API</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Developer · Live data fetch mid-conversation</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 16 }}>
              When enabled, the AI calls your custom REST endpoint mid-conversation to fetch live data — inventory, bookings, customer info, or any business logic.
            </p>
            {integrations.custom_api_configured ? (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 16 }}>
                ✓ Custom API configured — toggle it on to enable mid-call data fetching.
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Not configured</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>Set up your Custom API endpoint in the Agent Settings first.</div>
                <a href={agentId ? `/dashboard/agents/${agentId}` : "/dashboard/agents"} style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#0891B2", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                  → Open Agent Settings
                </a>
              </div>
            )}
            <div style={{ background: "#f0fdff", border: "1px solid #a5f3fc", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "#155e75", lineHeight: 1.6 }}>
              💡 <strong>How it works:</strong> The AI sends a <code>query</code> parameter to your endpoint and reads the response. GET requests use query params; POST requests send <code>{`{"query":"..."}`}</code>. Configure the endpoint URL and auth in Agent Settings → Custom URL.
            </div>
          </div>
        );
      case "google_sheets":
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#0F9D58", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={`${CDN}/googlesheets.svg`} width={22} height={22} alt="Google Sheets" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>Google Sheets</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Data · Auto-log leads after every call</div>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 16 }}>
              When enabled, a new row is appended to your Google Sheet after every call — capturing caller name, phone, summary, sentiment, and booked appointment details.
            </p>
            {integrations.google_connected ? (
              <div style={{ padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", marginBottom: 16 }}>
                ✓ Google connected — toggle it on to start logging calls to Sheets automatically.
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Not connected</div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>Connect your Google account first to enable automatic call logging to Sheets.</div>
                <a href="/dashboard/integrations" style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#0F9D58", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                  → Connect Google
                </a>
              </div>
            )}
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "#166534", lineHeight: 1.6 }}>
              💡 <strong>What gets logged:</strong> Caller phone, name, call duration, AI summary, sentiment score, action items, and appointment datetime (if booked). Each call = one new row.
            </div>
          </div>
        );
      case "human_transfer":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Human Transfer</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Allow the AI to transfer the call to a real human if requested or if sentiment drops.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Note: You must set your Forwarding Number in the Agent Settings page.
            </p>
          </div>
        );
      case "knowledge_base":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Knowledge Base</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Allow the AI to search your uploaded documents during a call.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Manage documents in the Agent Knowledge Base tab.
            </p>
          </div>
        );
      case "email_summary":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Email Summary</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Receive an email summary with transcript and action items after every call.
            </p>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40, padding: "0 16px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👈</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: 8 }}>Click any tool to configure</div>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
              Select a tool from the left to see its setup guide and configuration options here.
              Tools with a <span style={{ color: "#d97706", fontWeight: 700 }}>🔒 lock</span> need to be connected in Integrations first.
            </p>
          </div>
        );
    }
  };

  const selectedAgent = agents.find((a: any) => a.id === agentId);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "var(--text)" }}>Inbound Call Setup</h1>
          <select
            style={{ ...inp, width: 280, padding: "8px 14px", fontWeight: 600, cursor: agents.length === 0 ? "not-allowed" : "pointer" }}
            value={agentId}
            onChange={e => {
              setAgentId(e.target.value);
              router.replace(`/dashboard/call-flow?agent=${e.target.value}`);
            }}
            disabled={agents.length === 0}
          >
            {!agentsLoaded && <option value="">Loading agents...</option>}
            {agentsLoaded && agents.length === 0 && <option value="">— No agents found —</option>}
            {agentsLoaded && agents.length > 0 && !agentId && <option value="">— Select an Agent —</option>}
            {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {selectedAgent && (
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "var(--surface)", padding: "4px 10px", borderRadius: 6 }}>
              {selectedAgent.phone_number || selectedAgent.legacy_number || "No phone number"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {agentId && (
            <button onClick={() => router.push(`/dashboard/agents/${agentId}`)} style={btn("var(--bg)", { color: "var(--text)", border: "1.5px solid var(--border)" })}>
              ← Agent Settings
            </button>
          )}
          <button onClick={saveFlow} disabled={saving || !agentId} style={{ ...btn(), opacity: !agentId ? 0.5 : 1 }}>
            {saving ? "Saving..." : "Deploy Flow"}
          </button>
        </div>
      </div>

      {!agentId ? (
        <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 15, color: "var(--text-muted)" }}>
          <span style={{ fontSize: "3.5rem" }}>🤖</span>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Select an Agent</h2>
          <p style={{ fontSize: "0.95rem", maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>Choose an agent from the dropdown above to configure its call flow — which tools it can use during calls and what automations fire after.</p>
        </div>
      ) : loading ? (
        <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>Loading flow...</div>
      ) : (
        <div style={mainLayout}>
          {/* Timeline Panel */}
          <div style={timelinePane}>
            
            {/* Phase 2: During Call */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 800, fontSize: "1.2rem", marginBottom: 15 }}>1</div>
              {renderTimelineCard("During the Call", "What tools can the AI use while speaking?", [
                { id: "knowledge_base",     label: "Knowledge Base",    phase: "during_call" },
                { id: "google_sheet_kb",    label: "Sheets KB Search",  phase: "during_call" },
                { id: "human_transfer",     label: "Human Transfer",    phase: "during_call" },
                { id: "google_calendar",    label: "Google Calendar",   phase: "during_call" },
                { id: "google_sheet_slots", label: "Sheet Booking Slots", phase: "during_call" },
                { id: "shopify",            label: "Shopify Lookup",    phase: "during_call" },
                { id: "custom_api",         label: "Custom API",        phase: "during_call" },
              ])}
            </div>
            
            <div style={{ width: 4, height: 60, background: "linear-gradient(to bottom, var(--blue), #10b981)" }} />
            
            {/* Phase 3: Post Call */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 800, fontSize: "1.2rem", marginBottom: 15 }}>2</div>
              {renderTimelineCard("After the Call", "What automations run when the user hangs up?", [
                { id: "email_summary",   label: "Email Summary",   phase: "post_call" },
                { id: "google_sheets",   label: "Google Sheets",   phase: "post_call" },
                { id: "webhook_post",    label: "Webhook",         phase: "post_call" },
                { id: "airtable_log",    label: "Airtable Log",    phase: "post_call" },
                { id: "hubspot_sync",    label: "HubSpot Sync",    phase: "post_call" },
                { id: "salesforce_sync", label: "Salesforce Sync", phase: "post_call" },
              ])}
            </div>

          </div>
          
          {/* Config Panel */}
          <div style={configPane}>
            <div style={{ padding: 24, borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>Configuration</h2>
            </div>
            <div style={{ padding: 24 }}>
              {renderGuide()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
