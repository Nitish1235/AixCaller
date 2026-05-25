"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchIntegrations, apiPatch, API_BASE_URL, getTenantId } from "@/lib/api";

/* ─── TYPES ────────────────────────────────────────────────────── */
interface NodeDef {
  id: string;
  stage: number;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  bgColor: string;
}

/* ─── NODE DEFINITIONS ─────────────────────────────────────────── */
// Stage 0 = trigger, stage 1 = during, stage 2 = after
const PIPELINE_NODES: NodeDef[] = [
  { id: "trigger",      stage: 0, label: "Call Received",      sublabel: "Inbound call rings",          icon: "📞", color: "#059669", bgColor: "#ecfdf5" },
  { id: "ai_answers",   stage: 0, label: "AI Answers",         sublabel: "Agent picks up instantly",     icon: "🤖", color: "#2563eb", bgColor: "#eff6ff" },
  // During call — branch nodes
  { id: "calendar",     stage: 1, label: "Book Meeting",       sublabel: "Google Calendar",              icon: "🗓️", color: "#2563eb", bgColor: "#eff6ff" },
  { id: "kb_sheet",     stage: 1, label: "Knowledge Lookup",   sublabel: "Google Sheets search",         icon: "📚", color: "#059669", bgColor: "#ecfdf5" },
  { id: "api_lookup",   stage: 1, label: "Live API Fetch",     sublabel: "Mid-call REST call",           icon: "🔗", color: "#0ea5e9", bgColor: "#f0f9ff" },
  // After call — branch nodes
  { id: "sheets_log",   stage: 2, label: "Log to Sheets",      sublabel: "Spreadsheet row write",        icon: "📝", color: "#059669", bgColor: "#ecfdf5" },
  { id: "zoho_crm",     stage: 2, label: "Zoho CRM Sync",      sublabel: "Lead & transcript push",       icon: "💼", color: "#7c3aed", bgColor: "#f5f3ff" },
  { id: "email_summary",stage: 2, label: "Email Summary",      sublabel: "Admin inbox notification",     icon: "📧", color: "#db2777", bgColor: "#fdf2f8" },
  { id: "webhook",      stage: 2, label: "Webhook Export",     sublabel: "Custom API dispatch",          icon: "⚡", color: "#0ea5e9", bgColor: "#f0f9ff" },
];

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1.5px solid #e2e8f0", fontSize: "0.85rem",
  outline: "none", fontFamily: "inherit", color: "#0f172a",
  boxSizing: "border-box", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.7rem", fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5,
};

/* ─── CONNECTOR SVG ────────────────────────────────────────────── */
function Arrow({ active, color = "#e2e8f0", vertical = false }: { active?: boolean; color?: string; vertical?: boolean }) {
  if (vertical) {
    return (
      <div style={{ display: "flex", justifyContent: "center", height: 32, position: "relative" }}>
        <svg width="2" height="32" style={{ overflow: "visible" }}>
          <line x1="1" y1="0" x2="1" y2="28" stroke={active ? color : "#e2e8f0"} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={active ? "none" : "4 3"} />
          <polygon points="1,32 -3,24 5,24" fill={active ? color : "#e2e8f0"} />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", width: 36, flexShrink: 0 }}>
      <svg width="36" height="14" style={{ overflow: "visible" }}>
        <line x1="0" y1="7" x2="30" y2="7" stroke={active ? color : "#e2e8f0"} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={active ? "none" : "4 3"} />
        <polygon points="36,7 26,3 26,11" fill={active ? color : "#e2e8f0"} />
      </svg>
    </div>
  );
}

/* ─── PIPELINE NODE CARD ───────────────────────────────────────── */
function PipelineNode({ node, active, selected, onClick }: {
  node: NodeDef; active: boolean; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? node.bgColor : "#fff",
        border: selected ? `2px solid ${node.color}` : active ? `2px solid ${node.color}60` : "1.5px solid #e2e8f0",
        borderRadius: 12,
        padding: "12px 14px",
        minWidth: 160,
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: selected ? `0 4px 20px ${node.color}20` : "0 2px 8px rgba(0,0,0,0.03)",
        position: "relative",
      }}
    >
      {/* Status dot */}
      <div style={{
        position: "absolute", top: 10, right: 10,
        width: 8, height: 8, borderRadius: "50%",
        background: active ? node.color : "#e2e8f0",
        boxShadow: active ? `0 0 0 3px ${node.color}20` : "none",
      }} />

      <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{node.icon}</div>
      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a", lineHeight: 1.3 }}>{node.label}</div>
      <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 3 }}>{node.sublabel}</div>

      {active && (
        <div style={{ marginTop: 8, fontSize: "0.6rem", fontWeight: 800, color: node.color, background: node.bgColor, borderRadius: 99, padding: "2px 8px", display: "inline-block", border: `1px solid ${node.color}30` }}>
          ACTIVE
        </div>
      )}
      {!active && (
        <div style={{ marginTop: 8, fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", background: "#f8fafc", borderRadius: 99, padding: "2px 8px", display: "inline-block", border: "1px solid #e2e8f0" }}>
          Configure
        </div>
      )}
    </div>
  );
}

/* ─── MAIN PAGE ────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const [cfg, setCfg] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    googleCalendarId: "primary",
    googleSheetId: "",
    googleSheetName: "Leads",
    zohoDC: "us",
    emailEnabled: true,
    contactEmail: "",
    customWebhookUrl: "",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = useCallback(async () => {
    try {
      const data = await fetchIntegrations(getTenantId());
      if (data) {
        setCfg(data);
        setSettings(prev => ({
          ...prev,
          googleCalendarId: data.google_calendar_id || "primary",
          googleSheetId: data.google_sheet_id || "",
          googleSheetName: data.google_sheet_name || "Leads",
          zohoDC: data.zoho_domain?.includes("eu") ? "eu" : "us",
          emailEnabled: data.email_summary_enabled ?? true,
          contactEmail: data.contact_email || "",
          customWebhookUrl: data.webhook_url || "",
        }));
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectGoogle = () => { window.location.href = `${API_BASE_URL}/google/install?tenant_id=${getTenantId()}`; };
  const connectZoho = () => { window.location.href = `${API_BASE_URL}/zoho/install?tenant_id=${getTenantId()}&dc=${settings.zohoDC}`; };

  const disconnectPlatform = async (platform: "google" | "zoho") => {
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/${platform}/disconnect?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load(); showToast(`Disconnected ${platform === "google" ? "Google" : "Zoho"}`);
    } catch { showToast("Disconnect failed."); }
    setSaving(false);
  };

  const saveSettings = async () => {
    const tid = getTenantId();
    setSaving(true);
    try {
      await apiPatch(`/integrations?tenant_id=${tid}`, {
        email_summary_enabled: settings.emailEnabled,
        contact_email: settings.contactEmail || null,
        webhook_url: settings.customWebhookUrl || null,
      });
      if (cfg.google_connected) {
        await fetch(`${API_BASE_URL}/google/settings`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tid, calendar_id: settings.googleCalendarId, sheet_id: settings.googleSheetId, sheet_name: settings.googleSheetName }),
        });
      }
      await load(); showToast("✅ Settings saved!");
    } catch { showToast("⚠️ Failed to save."); }
    setSaving(false);
  };

  const isActive = (id: string): boolean => {
    if (id === "trigger" || id === "ai_answers") return true;
    if (id === "calendar")     return !!(cfg.google_connected && settings.googleCalendarId);
    if (id === "kb_sheet")     return !!(cfg.google_connected && settings.googleSheetId);
    if (id === "api_lookup")   return !!cfg.custom_api_enabled;
    if (id === "sheets_log")   return !!(cfg.google_connected && settings.googleSheetId);
    if (id === "zoho_crm")     return !!cfg.zoho_connected;
    if (id === "email_summary")return !!(settings.emailEnabled && settings.contactEmail);
    if (id === "webhook")      return !!settings.customWebhookUrl;
    return false;
  };

  const node = PIPELINE_NODES.find(n => n.id === selectedNode);
  const duringNodes = PIPELINE_NODES.filter(n => n.stage === 1);
  const afterNodes  = PIPELINE_NODES.filter(n => n.stage === 2);

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        .pipe-node:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 3000, background: toast.includes("⚠️") ? "#ef4444" : "#059669", color: "#fff", borderRadius: 12, padding: "14px 22px", fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", fontSize: "0.88rem" }}>{toast}</div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", height: "calc(100vh - 64px - 4.5rem)", minHeight: 0 }}>

        {/* ── LEFT: Pipeline Canvas ─────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0, overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>Inbound Call Flow</h1>
              <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "0.85rem" }}>Click any node to configure it. Connected nodes are always active.</p>
            </div>
            <button onClick={saveSettings} disabled={saving} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)", opacity: saving ? 0.7 : 1, flexShrink: 0 }}>
              {saving ? "Saving…" : "💾 Save Flow"}
            </button>
          </div>

          {/* ── Pipeline Canvas ── */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 16,
            padding: "2rem",
            flex: 1,
            minHeight: 480,
            position: "relative",
            backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            overflowX: "auto",
          }}>

            {/* Stage labels */}
            <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", paddingLeft: 4 }}>
              {[
                { label: "TRIGGER",    color: "#059669", width: 380 },
                { label: "DURING CALL (pick any)",  color: "#2563eb", width: 580 },
                { label: "AFTER CALL (pick any)",   color: "#db2777", width: 580 },
              ].map(s => (
                <div key={s.label} style={{ width: s.width, flexShrink: 0 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: s.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main pipeline row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>

              {/* Stage 0: Trigger nodes */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                <PipelineNode node={PIPELINE_NODES[0]} active={isActive("trigger")} selected={selectedNode === "trigger"} onClick={() => setSelectedNode(selectedNode === "trigger" ? null : "trigger")} />
                <Arrow active={true} color="#059669" />
                <PipelineNode node={PIPELINE_NODES[1]} active={isActive("ai_answers")} selected={selectedNode === "ai_answers"} onClick={() => setSelectedNode(selectedNode === "ai_answers" ? null : "ai_answers")} />
                <Arrow active={true} color="#2563eb" />
              </div>

              {/* Stage 1: During call nodes (vertical stack) */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {duringNodes.map(n => (
                    <div key={n.id} style={{ display: "flex", alignItems: "center" }}>
                      <PipelineNode node={n} active={isActive(n.id)} selected={selectedNode === n.id} onClick={() => setSelectedNode(selectedNode === n.id ? null : n.id)} />
                    </div>
                  ))}
                </div>
                <Arrow active={duringNodes.some(n => isActive(n.id))} color="#0ea5e9" />
              </div>

              {/* Stage 2: After call nodes (vertical stack) */}
              <div style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {afterNodes.map(n => (
                    <PipelineNode key={n.id} node={n} active={isActive(n.id)} selected={selectedNode === n.id} onClick={() => setSelectedNode(selectedNode === n.id ? null : n.id)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#2563eb" strokeWidth="2" /></svg>
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>Active path</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 3" /></svg>
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>Inactive</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>Node live</span>
              </div>
            </div>
          </div>

          {/* Platform connection cards at bottom */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", flexShrink: 0 }}>
            {/* Google */}
            <div style={{ background: "#fff", border: `1.5px solid ${cfg.google_connected ? "#059669" : "#e2e8f0"}`, borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.google_connected ? "#ecfdf5" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>Google Workspace</div>
                <div style={{ fontSize: "0.72rem", color: cfg.google_connected ? "#059669" : "#94a3b8", fontWeight: 600 }}>{cfg.google_connected ? "✓ Connected — Calendar & Sheets active" : "Not connected"}</div>
              </div>
              {cfg.google_connected ? (
                <button onClick={() => disconnectPlatform("google")} disabled={saving} style={{ background: "none", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 7, padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Disconnect</button>
              ) : (
                <button onClick={connectGoogle} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.2)" }}>Connect →</button>
              )}
            </div>
            {/* Zoho */}
            <div style={{ background: "#fff", border: `1.5px solid ${cfg.zoho_connected ? "#7c3aed" : "#e2e8f0"}`, borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.zoho_connected ? "#f5f3ff" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>💼</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>Zoho CRM</div>
                <div style={{ fontSize: "0.72rem", color: cfg.zoho_connected ? "#7c3aed" : "#94a3b8", fontWeight: 600 }}>{cfg.zoho_connected ? "✓ Connected — Leads syncing" : "Not connected"}</div>
              </div>
              {cfg.zoho_connected ? (
                <button onClick={() => disconnectPlatform("zoho")} disabled={saving} style={{ background: "none", border: "1.5px solid #fecaca", color: "#ef4444", borderRadius: 7, padding: "5px 12px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Disconnect</button>
              ) : (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select value={settings.zohoDC} onChange={e => setSettings({ ...settings, zohoDC: e.target.value })} style={{ ...inp, width: "auto", padding: "5px 8px", fontSize: "0.75rem" }}>
                    <option value="us">US</option><option value="eu">EU</option><option value="in">IN</option>
                  </select>
                  <button onClick={connectZoho} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Connect →</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Config Drawer ─────────────────────────────────── */}
        {selectedNode && node && (
          <div style={{
            width: 320, flexShrink: 0,
            background: "#fff",
            border: `1.5px solid ${node.color}40`,
            borderRadius: 16,
            boxShadow: `0 8px 32px ${node.color}10`,
            display: "flex", flexDirection: "column",
            animation: "fadeIn 0.2s ease",
            overflow: "hidden",
          }}>
            {/* Drawer header */}
            <div style={{ padding: "1.25rem", borderBottom: "1.5px solid #f1f5f9", background: node.bgColor }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "1.6rem" }}>{node.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{node.label}</div>
                    <div style={{ fontSize: "0.72rem", color: node.color, fontWeight: 700, marginTop: 1 }}>{node.sublabel}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, padding: 0 }}>×</button>
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ padding: "1.25rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Active status */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                borderRadius: 8, background: isActive(selectedNode) ? "#ecfdf5" : "#f8fafc",
                border: `1px solid ${isActive(selectedNode) ? "#bbf7d0" : "#e2e8f0"}`,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive(selectedNode) ? "#059669" : "#e2e8f0" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isActive(selectedNode) ? "#059669" : "#94a3b8" }}>
                  {isActive(selectedNode) ? "Node is active and running" : "Node is inactive — configure below"}
                </span>
              </div>

              {/* ── Trigger: read-only ── */}
              {(selectedNode === "trigger" || selectedNode === "ai_answers") && (
                <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>
                  {selectedNode === "trigger"
                    ? "This node fires automatically when an inbound call arrives on your connected phone number."
                    : "Your AI agent picks up and begins the conversation. Configure the agent's voice, personality, and knowledge base in the Agents section."}
                </div>
              )}

              {/* ── Calendar ── */}
              {selectedNode === "calendar" && (
                cfg.google_connected ? (
                  <>
                    <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>✓ Google Workspace connected</div>
                    <div><label style={lbl}>Calendar ID</label><input style={inp} value={settings.googleCalendarId} onChange={e => setSettings({ ...settings, googleCalendarId: e.target.value })} placeholder="primary" /></div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Use &quot;primary&quot; for your main calendar, or paste a specific Google Calendar ID.</div>
                  </>
                ) : (
                  <button onClick={connectGoogle} style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>🔗 Connect Google Workspace</button>
                )
              )}

              {/* ── KB Sheet ── */}
              {selectedNode === "kb_sheet" && (
                <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>
                  Configure this in the <strong style={{ color: "#2563eb" }}>Agent Details → Knowledge Base</strong> tab. Upload a Google Sheet to enable real-time data lookups mid-call.
                </div>
              )}

              {/* ── API Lookup ── */}
              {selectedNode === "api_lookup" && (
                <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>
                  Add your REST API URL in the <strong style={{ color: "#2563eb" }}>Agent Details</strong> page. The AI will call your endpoint mid-conversation to fetch live data.
                </div>
              )}

              {/* ── Sheets Log ── */}
              {selectedNode === "sheets_log" && (
                cfg.google_connected ? (
                  <>
                    <div><label style={lbl}>Spreadsheet ID</label><input style={inp} value={settings.googleSheetId} onChange={e => setSettings({ ...settings, googleSheetId: e.target.value })} placeholder="From URL: /d/YOUR_ID/edit" /></div>
                    <div><label style={lbl}>Sheet Tab Name</label><input style={inp} value={settings.googleSheetName} onChange={e => setSettings({ ...settings, googleSheetName: e.target.value })} placeholder="Leads" /></div>
                  </>
                ) : (
                  <button onClick={connectGoogle} style={{ width: "100%", background: "#059669", color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>🔗 Connect Google first</button>
                )
              )}

              {/* ── Zoho CRM ── */}
              {selectedNode === "zoho_crm" && (
                cfg.zoho_connected ? (
                  <div style={{ background: "#f5f3ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", color: "#7c3aed", fontWeight: 600 }}>✓ Leads are syncing to Zoho CRM automatically.</div>
                ) : (
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Connect Zoho CRM in the platform connections section below to enable this node.</div>
                )
              )}

              {/* ── Email Summary ── */}
              {selectedNode === "email_summary" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>Send summaries</span>
                    <input type="checkbox" checked={settings.emailEnabled} onChange={e => setSettings({ ...settings, emailEnabled: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#db2777" }} />
                  </div>
                  <div><label style={lbl}>Recipient Email</label><input type="email" style={inp} value={settings.contactEmail} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} placeholder="you@company.com" /></div>
                </>
              )}

              {/* ── Webhook ── */}
              {selectedNode === "webhook" && (
                <div><label style={lbl}>Webhook URL</label><input style={inp} value={settings.customWebhookUrl} onChange={e => setSettings({ ...settings, customWebhookUrl: e.target.value })} placeholder="https://your-server.com/call-logs" /></div>
              )}

              {/* Save button for configurable nodes */}
              {!["trigger", "ai_answers", "kb_sheet", "api_lookup", "zoho_crm"].includes(selectedNode) && (
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  style={{ width: "100%", background: node.color, color: "#fff", border: "none", borderRadius: 9, padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", marginTop: "auto", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
