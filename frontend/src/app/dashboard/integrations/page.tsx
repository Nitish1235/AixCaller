"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchIntegrations, apiPatch, API_BASE_URL, getTenantId } from "@/lib/api";

// ── Premium Clean Corporate Styling & Color Palette ─────────────────────────
const colors = {
  bg: "transparent",
  panelBg: "#ffffff",
  borderDefault: "var(--border)",
  borderActive: "var(--blue)",
  textMuted: "var(--text-muted)",
  calendar: "var(--blue)", // Modern Corporate Blue
  sheets: "var(--green)",   // Modern Corporate Green
  zoho: "#7c3aed",         // Premium Purple
  email: "#db2777",        // Elegant Pink
  webhook: "#0ea5e9",      // Ocean Cyan
};

const glassCard = (active: boolean, color: string = "var(--blue)", extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#ffffff",
  border: active ? `2px solid ${color}` : "1.5px solid var(--border)",
  borderRadius: 20,
  padding: "1.5rem",
  boxShadow: active 
    ? `0 12px 30px rgba(0, 0, 0, 0.03), 0 0 15px ${color}15`
    : "0 4px 15px rgba(0,0,0,0.02)",
  color: "var(--text)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  ...extra,
});

interface IntegrationCard {
  id: string;
  phase: 1 | 2 | 3;
  label: string;
  sublabel: string;
  description: string;
  icon: string;
  color: string;
  docsHelp?: string;
}

export default function IntegrationsPage() {
  const [cfg, setCfg] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Settings inputs
  const [tempSettings, setTempSettings] = useState({
    googleCalendarId: "primary",
    googleSheetId: "",
    googleSheetName: "Leads",
    zohoDC: "us",
    emailEnabled: true,
    contactEmail: "",
    customWebhookUrl: "",
    customWebhookMethod: "POST"
  });

  const cardsList: IntegrationCard[] = [
    // Phase 1 (Call Rings)
    {
      id: "act_calendar",
      phase: 1,
      label: "Schedule Meetings",
      sublabel: "Google Calendar Booking",
      description: "Allows the AI to check your free slots in real-time and book appointments directly with customers.",
      icon: "🗓️",
      color: colors.calendar,
      docsHelp: "Make sure you connect your Google Account first. Enter 'primary' for your main calendar, or enter a custom Google Calendar ID."
    },
    // Phase 2 (Live Call)
    {
      id: "act_sync_kb",
      phase: 2,
      label: "Search Live Knowledge Base",
      sublabel: "Google Sheet Search Brain",
      description: "Empowers the AI to look up spreadsheets in real-time to answer caller questions about inventory, hours, or prices.",
      icon: "📚",
      color: colors.sheets,
      docsHelp: "This makes the AI check spreadsheet rows dynamically. It is configured directly inside the Agent Details page 'Knowledge Base' tab."
    },
    {
      id: "act_webhook_lookup",
      phase: 2,
      label: "Look up Live Systems",
      sublabel: "Mid-Call REST API Sync",
      description: "Instructs the AI to fetch information from your custom URL mid-call (e.g. tracking numbers, member packages).",
      icon: "🔗",
      color: colors.webhook,
      docsHelp: "When a caller asks something, the AI calls your URL with the question and uses the answer in the conversation. Setup is in the Agent Details page."
    },
    // Phase 3 (Call Ended)
    {
      id: "act_sheets",
      phase: 3,
      label: "Log Lead Spreadsheets",
      sublabel: "Google Sheets Post-Call Log",
      description: "Automatically writes caller phone, timestamp, summary, and actions to your Google Sheet rows when the call hangs up.",
      icon: "📝",
      color: colors.sheets,
      docsHelp: "Saves details to a spreadsheet. Go to Google Sheets, copy the long ID from the URL (between /d/ and /edit), and paste it in the settings."
    },
    {
      id: "act_crm",
      phase: 3,
      label: "Sync Zoho CRM Leads",
      sublabel: "Zoho CRM Customer Handoff",
      description: "Logs customer names, sentiment, summaries, and transcripts to your sales dashboard as leads instantly after calls.",
      icon: "💼",
      color: colors.zoho,
      docsHelp: "Select your Zoho Data Center region (US, EU, or IN) and click Connect. AIX Caller will automatically handle auth refresh tokens securely."
    },
    {
      id: "act_email",
      phase: 3,
      label: "Email Call Summary",
      sublabel: "Instant Inbox Notification",
      description: "Sends a beautiful, formatted email summary with sentiment, actions, and a full transcript to your admin inbox.",
      icon: "📧",
      color: colors.email,
      docsHelp: "Enter your contact email address. Resend will send complete call briefings instantly once a call concludes."
    },
    {
      id: "act_webhook",
      phase: 3,
      label: "Export Raw Call Data",
      sublabel: "Post-Call Webhook Dispatch",
      description: "Forwards complete structured call information (transcripts, summaries, metadata) to your own custom API.",
      icon: "⚡",
      color: colors.webhook,
      docsHelp: "Advanced developers: We will trigger a POST request with the call payload to this target URL once the call is processed."
    }
  ];

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  // Fetch backend configurations
  const load = useCallback(async () => {
    const tid = getTenantId();
    try {
      const data = await fetchIntegrations(tid);
      if (data) {
        setCfg(data);
        setTempSettings(prev => ({
          ...prev,
          googleCalendarId: data.google_calendar_id || "primary",
          googleSheetId: data.google_sheet_id || "",
          googleSheetName: data.google_sheet_name || "Leads",
          zohoDC: data.zoho_domain ? (data.zoho_domain.includes("eu") ? "eu" : "us") : "us",
          emailEnabled: data.email_summary_enabled ?? true,
          contactEmail: data.contact_email || "",
          customWebhookUrl: data.webhook_url || ""
        }));
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectGoogle = () => {
    const tid = getTenantId();
    window.location.href = `${API_BASE_URL}/google/install?tenant_id=${tid}`;
  };

  const connectZoho = () => {
    const tid = getTenantId();
    window.location.href = `${API_BASE_URL}/zoho/install?tenant_id=${tid}&dc=${tempSettings.zohoDC}`;
  };

  const disconnectPlatform = async (platform: "google" | "zoho") => {
    const tid = getTenantId();
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/${platform}/disconnect?tenant_id=${tid}`, { method: "DELETE" });
      await load();
      showToast(`🔌 Disconnected ${platform === "google" ? "Google Workspace" : "Zoho CRM"}`);
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(false);
  };

  // Save current dynamic parameters
  const saveWorkflowSettings = async () => {
    const tid = getTenantId();
    setSaving(true);
    try {
      // 1. Save standard tenant integrations
      await apiPatch(`/integrations?tenant_id=${tid}`, {
        email_summary_enabled: tempSettings.emailEnabled,
        contact_email: tempSettings.contactEmail || null,
        webhook_url: tempSettings.customWebhookUrl || null
      });

      // 2. Save Google-specific integration configs
      if (cfg.google_connected) {
        await fetch(`${API_BASE_URL}/google/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tid,
            calendar_id: tempSettings.googleCalendarId,
            sheet_id: tempSettings.googleSheetId,
            sheet_name: tempSettings.googleSheetName
          })
        });
      }

      await load();
      showToast("✅ Workflows successfully saved and live!");
    } catch (e) {
      showToast("⚠️ Failed to save changes.");
    }
    setSaving(false);
  };

  // One-click recipes
  const applyPresetRecipe = (recipeType: "receptionist" | "crm_sheets" | "full_automation") => {
    if (recipeType === "receptionist") {
      setTempSettings(prev => ({
        ...prev,
        emailEnabled: true,
        googleCalendarId: "primary"
      }));
    } else if (recipeType === "crm_sheets") {
      setTempSettings(prev => ({
        ...prev,
        emailEnabled: false
      }));
    } else {
      setTempSettings(prev => ({
        ...prev,
        emailEnabled: true,
        googleCalendarId: "primary"
      }));
    }
    showToast(`⚡ Loaded Preset Package parameters successfully!`);
  };

  // Determine if a card is active
  const isCardActive = (cardId: string): boolean => {
    if (cardId === "act_calendar") return !!(cfg.google_connected && tempSettings.googleCalendarId);
    if (cardId === "act_sync_kb") return !!(cfg.google_connected && tempSettings.googleSheetId);
    if (cardId === "act_webhook_lookup") return !!cfg.custom_api_enabled; // Check agent tool configs
    if (cardId === "act_sheets") return !!(cfg.google_connected && tempSettings.googleSheetId);
    if (cardId === "act_crm") return !!cfg.zoho_connected;
    if (cardId === "act_email") return !!(tempSettings.emailEnabled && tempSettings.contactEmail);
    if (cardId === "act_webhook") return !!tempSettings.customWebhookUrl;
    return false;
  };

  const selectedNode = cardsList.find(c => c.id === selectedCardId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%", minHeight: "100vh", color: "var(--text)", background: "transparent" }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 3000,
          background: "var(--green)", color: "#fff", borderRadius: 12,
          padding: "16px 24px", fontWeight: 800,
          boxShadow: "0 10px 30px rgba(5, 150, 105, 0.2)",
          transition: "all 0.3s"
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--border)", paddingBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontWeight: 950, fontSize: "2.4rem", margin: 0, background: "linear-gradient(to right, var(--blue), #4f46e5, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px" }}>
            🤖 AI Customer Journey Blueprint
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: "1.05rem", fontWeight: 600 }}>
            Configure exactly what the AI receptionist does at each step of a call.
          </p>
        </div>
        <button 
          onClick={saveWorkflowSettings} 
          disabled={saving} 
          style={{
            background: "var(--blue)",
            color: "#fff", fontWeight: 800, fontSize: "0.95rem", border: "none",
            borderRadius: 10, padding: "12px 24px", cursor: "pointer",
            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)",
            transition: "all 0.2s ease"
          }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseOut={e => e.currentTarget.style.transform = "none"}
        >
          {saving ? "Saving Changes..." : "⚡ Save Blueprint Configuration"}
        </button>
      </div>

      {/* Quick Business Packages Presets */}
      <div style={glassCard(false, "var(--blue)", { padding: "1.25rem 1.75rem", border: "1.5px dashed var(--border)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 })}>
        <span style={{ fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--blue)", letterSpacing: 0.5 }}>⚡ One-Click Business Setup Packages:</span>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            ["receptionist", "📞 Office Receptionist Package", "Enables calendar bookings, RAG sheet questions, and logs call details."],
            ["crm_sheets", "📝 Sales Leads & CRM Funnel", "Auto syncs contact records to Sheet Leads and Zoho CRM systems."],
            ["full_automation", "🚀 Full Agency Powerhouse", "Full calendar bookings, CRM syncs, post-call sheet logging, and email reports."]
          ].map(([type, title, desc]) => (
            <button
              key={type}
              onClick={() => applyPresetRecipe(type as any)}
              style={{
                background: "#ffffff", border: "1.5px solid var(--border)",
                borderRadius: 10, padding: "8px 16px", color: "var(--text)", cursor: "pointer",
                fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s ease"
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "var(--blue-light)";
                e.currentTarget.style.borderColor = "var(--blue)";
                e.currentTarget.style.color = "var(--blue)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text)";
              }}
              title={desc}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Visual Pipeline (Timeline Rows) & Config Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "2rem", alignItems: "stretch" }}>
        
        {/* INTERACTIVE CALL TIMELINE BLUEPRINT */}
        <div style={{
          position: "relative",
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 28,
          padding: "2.5rem",
          backgroundImage: "radial-gradient(rgba(29, 78, 216, 0.08) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          minHeight: 680,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.02)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "2.5rem"
        }}>
          
          {/* Dynamic SVG background overlay for curved pipeline connections */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
            <defs>
              {cardsList.map(c => (
                <linearGradient key={`grad-${c.id}`} id={`grad-${c.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor={c.color} stopOpacity="0.9" />
                </linearGradient>
              ))}
            </defs>

            {/* Render pipeline wires for each Call Phase */}
            {/* Phase 1 Wire */}
            {(() => {
              const active = isCardActive("act_calendar");
              const dPath = "M 195 105 C 280 105, 330 105, 410 105";
              return (
                <g>
                  <path d={dPath} fill="none" stroke={active ? colors.calendar : "rgba(15, 23, 42, 0.08)"} strokeWidth={active ? 3.5 : 2} strokeOpacity={active ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active && (
                    <path d={dPath} fill="none" stroke={colors.calendar} strokeWidth="8" strokeOpacity="0.15" />
                  )}
                  {active && (
                    <circle r="4.5" fill={colors.calendar}>
                      <animateMotion dur="2s" repeatCount="indefinite" path={dPath} />
                    </circle>
                  )}
                </g>
              );
            })()}

            {/* Phase 2 Wires (Splits to two cards) */}
            {(() => {
              const active1 = isCardActive("act_sync_kb");
              const active2 = isCardActive("act_webhook_lookup");
              const path1 = "M 195 295 C 260 295, 310 215, 410 215";
              const path2 = "M 195 295 C 260 295, 310 375, 410 375";
              return (
                <g>
                  {/* Wire 1 */}
                  <path d={path1} fill="none" stroke={active1 ? colors.sheets : "rgba(15, 23, 42, 0.08)"} strokeWidth={active1 ? 3.5 : 2} strokeOpacity={active1 ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active1 && <path d={path1} fill="none" stroke={colors.sheets} strokeWidth="8" strokeOpacity="0.15" />}
                  {active1 && (
                    <circle r="4.5" fill={colors.sheets}>
                      <animateMotion dur="2.2s" repeatCount="indefinite" path={path1} />
                    </circle>
                  )}

                  {/* Wire 2 */}
                  <path d={path2} fill="none" stroke={active2 ? colors.webhook : "rgba(15, 23, 42, 0.08)"} strokeWidth={active2 ? 3.5 : 2} strokeOpacity={active2 ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active2 && <path d={path2} fill="none" stroke={colors.webhook} strokeWidth="8" strokeOpacity="0.15" />}
                  {active2 && (
                    <circle r="4.5" fill={colors.webhook}>
                      <animateMotion dur="2.4s" repeatCount="indefinite" path={path2} />
                    </circle>
                  )}
                </g>
              );
            })()}

            {/* Phase 3 Wires (Splits to four cards in a 2x2 grid) */}
            {(() => {
              const active1 = isCardActive("act_sheets");
              const active2 = isCardActive("act_crm");
              const active3 = isCardActive("act_email");
              const active4 = isCardActive("act_webhook");

              // Row heights approximately aligned with CSS positioning
              const path1 = "M 195 565 C 260 565, 300 485, 410 485";
              const path2 = "M 195 565 C 260 565, 300 565, 410 565";
              const path3 = "M 195 565 C 260 565, 300 645, 410 645";
              const path4 = "M 195 565 C 260 565, 300 725, 410 725";

              return (
                <g>
                  {/* Sheets Wire */}
                  <path d={path1} fill="none" stroke={active1 ? colors.sheets : "rgba(15, 23, 42, 0.08)"} strokeWidth={active1 ? 3.5 : 2} strokeOpacity={active1 ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active1 && <path d={path1} fill="none" stroke={colors.sheets} strokeWidth="8" strokeOpacity="0.15" />}
                  {active1 && (
                    <circle r="4.5" fill={colors.sheets}>
                      <animateMotion dur="2.5s" repeatCount="indefinite" path={path1} />
                    </circle>
                  )}

                  {/* Zoho Wire */}
                  <path d={path2} fill="none" stroke={active2 ? colors.zoho : "rgba(15, 23, 42, 0.08)"} strokeWidth={active2 ? 3.5 : 2} strokeOpacity={active2 ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active2 && <path d={path2} fill="none" stroke={colors.zoho} strokeWidth="8" strokeOpacity="0.15" />}
                  {active2 && (
                    <circle r="4.5" fill={colors.zoho}>
                      <animateMotion dur="2.7s" repeatCount="indefinite" path={path2} />
                    </circle>
                  )}

                  {/* Email Wire */}
                  <path d={path3} fill="none" stroke={active3 ? colors.email : "rgba(15, 23, 42, 0.08)"} strokeWidth={active3 ? 3.5 : 2} strokeOpacity={active3 ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active3 && <path d={path3} fill="none" stroke={colors.email} strokeWidth="8" strokeOpacity="0.15" />}
                  {active3 && (
                    <circle r="4.5" fill={colors.email}>
                      <animateMotion dur="2.3s" repeatCount="indefinite" path={path3} />
                    </circle>
                  )}

                  {/* Webhook Wire */}
                  <path d={path4} fill="none" stroke={active4 ? colors.webhook : "rgba(15, 23, 42, 0.08)"} strokeWidth={active4 ? 3.5 : 2} strokeOpacity={active4 ? 0.9 : 1} style={{ transition: "all 0.4s" }} />
                  {active4 && <path d={path4} fill="none" stroke={colors.webhook} strokeWidth="8" strokeOpacity="0.15" />}
                  {active4 && (
                    <circle r="4.5" fill={colors.webhook}>
                      <animateMotion dur="2.9s" repeatCount="indefinite" path={path4} />
                    </circle>
                  )}
                </g>
              );
            })()}
          </svg>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* PHASE 1: WHEN PHONE RINGS */}
          <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: "2rem", alignItems: "center", position: "relative", zIndex: 10 }}>
            {/* Timeline phase header */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px",
              background: "var(--green-light)", border: "1.5px solid var(--green)", borderRadius: 16,
              boxShadow: "0 4px 12px rgba(5,150,105,0.05)",
              height: "fit-content"
            }}>
              <div style={{ fontSize: "1.5rem" }}>📞</div>
              <h4 style={{ margin: 0, fontWeight: 900, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--green)", letterSpacing: 0.5 }}>1. Inbound Rings</h4>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.4 }}>When customer calls your AI phone number.</p>
            </div>

            {/* Phase 1 Automation Cards list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {cardsList.filter(c => c.phase === 1).map(card => {
                const active = isCardActive(card.id);
                return (
                  <div 
                    key={card.id} 
                    style={glassCard(active, card.color)}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: 14 }}>
                      <div style={{ fontSize: "2rem" }}>{card.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h3 style={{ margin: 0, fontWeight: 800, fontSize: "0.98rem" }}>{card.label}</h3>
                          <span style={{ fontSize: "0.62rem", padding: "3px 8px", background: active ? `${card.color}15` : "rgba(15,23,42,0.05)", border: `1.5px solid ${active ? card.color : "var(--border)"}`, borderRadius: 99, color: active ? card.color : "var(--text-muted)", fontWeight: 700 }}>
                            {active ? "⚡ LIVE ACTIVE" : "DISCONNECTED"}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>{card.description}</p>
                      </div>
                      <button 
                        style={{
                          background: active ? card.color : "#ffffff", color: active ? "#fff" : "var(--text)",
                          border: active ? "none" : "1.5px solid var(--border)",
                          borderRadius: 8, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer"
                        }}
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* PHASE 2: DURING THE LIVE CONVERSATION */}
          <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: "2rem", alignItems: "center", position: "relative", zIndex: 10 }}>
            {/* Timeline phase header */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px",
              background: "var(--blue-light)", border: "1.5px solid var(--blue)", borderRadius: 16,
              boxShadow: "0 4px 12px rgba(29,78,216,0.05)",
              height: "fit-content"
            }}>
              <div style={{ fontSize: "1.5rem" }}>💬</div>
              <h4 style={{ margin: 0, fontWeight: 900, fontSize: "0.85rem", textTransform: "uppercase", color: "var(--blue)", letterSpacing: 0.5 }}>2. Live Call</h4>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.4 }}>During the conversation with the customer.</p>
            </div>

            {/* Phase 2 Automation Cards list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {cardsList.filter(c => c.phase === 2).map(card => {
                const active = isCardActive(card.id);
                return (
                  <div 
                    key={card.id} 
                    style={glassCard(active, card.color)}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ fontSize: "2rem" }}>{card.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h3 style={{ margin: 0, fontWeight: 800, fontSize: "0.98rem" }}>{card.label}</h3>
                          <span style={{ fontSize: "0.62rem", padding: "3px 8px", background: active ? `${card.color}15` : "rgba(15,23,42,0.05)", border: `1px solid ${active ? card.color : "var(--border)"}`, borderRadius: 99, color: active ? card.color : "var(--text-muted)", fontWeight: 700 }}>
                            {active ? "⚡ LIVE ACTIVE" : "DISCONNECTED"}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>{card.description}</p>
                      </div>
                      <button 
                        style={{
                          background: active ? card.color : "#ffffff", color: active ? "#fff" : "var(--text)",
                          border: active ? "none" : "1.5px solid var(--border)",
                          borderRadius: 8, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer"
                        }}
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* PHASE 3: WHEN CALL IS FINISHED */}
          <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: "2rem", alignItems: "center", position: "relative", zIndex: 10 }}>
            {/* Timeline phase header */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px",
              background: "rgba(219, 39, 119, 0.05)", border: "1.5px solid #db2777", borderRadius: 16,
              boxShadow: "0 4px 12px rgba(219,39,119,0.05)",
              height: "fit-content"
            }}>
              <div style={{ fontSize: "1.5rem" }}>🏁</div>
              <h4 style={{ margin: 0, fontWeight: 900, fontSize: "0.85rem", textTransform: "uppercase", color: "#db2777", letterSpacing: 0.5 }}>3. Call Finishes</h4>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.4 }}>When caller hangs up and system wraps up logs.</p>
            </div>

            {/* Phase 3 Automation Cards list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {cardsList.filter(c => c.phase === 3).map(card => {
                const active = isCardActive(card.id);
                return (
                  <div 
                    key={card.id} 
                    style={glassCard(active, card.color)}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ fontSize: "2rem" }}>{card.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h3 style={{ margin: 0, fontWeight: 800, fontSize: "0.98rem" }}>{card.label}</h3>
                          <span style={{ fontSize: "0.62rem", padding: "3px 8px", background: active ? `${card.color}15` : "rgba(15,23,42,0.05)", border: `1px solid ${active ? card.color : "var(--border)"}`, borderRadius: 99, color: active ? card.color : "var(--text-muted)", fontWeight: 700 }}>
                            {active ? "⚡ LIVE ACTIVE" : "DISCONNECTED"}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>{card.description}</p>
                      </div>
                      <button 
                        style={{
                          background: active ? card.color : "#ffffff", color: active ? "#fff" : "var(--text)",
                          border: active ? "none" : "1.5px solid var(--border)",
                          borderRadius: 8, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer"
                        }}
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* SIDE CONFIGURATOR DRAWER */}
        <div style={glassCard(!!selectedCardId, selectedCardId ? selectedNode?.color : "var(--border)", { display: "flex", flexDirection: "column", gap: "1.25rem", height: "fit-content" })}>
          
          {selectedCardId && selectedNode ? (
            <>
              {/* Header */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "1.5px solid var(--border)", paddingBottom: 12 }}>
                <span style={{ fontSize: "2.2rem" }}>{selectedNode.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.15rem", color: selectedNode.color }}>{selectedNode.label}</h3>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>AUTOMATION SETTINGS</span>
                </div>
              </div>

              {/* Explainer */}
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-body)", lineHeight: 1.6 }}>
                {selectedNode.description}
              </p>

              {selectedNode.docsHelp && (
                <div style={{ background: `${selectedNode.color}08`, border: `1.5px dashed ${selectedNode.color}`, padding: 12, borderRadius: 10, fontSize: "0.76rem", color: "var(--text)", lineHeight: 1.5 }}>
                  💡 {selectedNode.docsHelp}
                </div>
              )}

              {/* Settings Input Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: 10 }}>
                <span style={{ fontWeight: 850, fontSize: "0.78rem", textTransform: "uppercase", color: "var(--blue)", letterSpacing: 0.5 }}>Configure parameters:</span>

                {/* Google Calendar (Appointments) */}
                {selectedNode.id === "act_calendar" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {!cfg.google_connected ? (
                      <button 
                        onClick={connectGoogle} 
                        style={{
                          background: colors.calendar, color: "#fff", fontWeight: 800, border: "none",
                          padding: "12px 14px", borderRadius: 12, cursor: "pointer", fontSize: "0.85rem",
                          boxShadow: "0 4px 12px rgba(29, 78, 216, 0.15)"
                        }}
                      >
                        🗓️ Click to Link Google Workspace
                      </button>
                    ) : (
                      <>
                        <div style={{ background: "var(--green-light)", padding: 10, borderRadius: 8, fontSize: "0.75rem", border: "1px solid var(--green)", color: "var(--green)" }}>
                          ✓ Google Workspace connected!
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "var(--text-muted)", marginBottom: 5 }}>TARGET CALENDAR ID</label>
                          <input 
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", background: "#ffffff", color: "var(--text)", outline: "none", fontSize: "0.85rem" }} 
                            value={tempSettings.googleCalendarId} 
                            onChange={e => setTempSettings({...tempSettings, googleCalendarId: e.target.value})} 
                            placeholder="primary" 
                          />
                        </div>
                        <button onClick={() => disconnectPlatform("google")} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, width: "fit-content", padding: 0 }}>
                          Disconnect Google Account
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Sheets Logging (Phase 3) */}
                {selectedNode.id === "act_sheets" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {!cfg.google_connected ? (
                      <button 
                        onClick={connectGoogle} 
                        style={{
                          background: colors.sheets, color: "#fff", fontWeight: 800, border: "none",
                          padding: "12px 14px", borderRadius: 12, cursor: "pointer", fontSize: "0.85rem",
                          boxShadow: "0 4px 12px rgba(5, 150, 105, 0.15)"
                        }}
                      >
                        📝 Link Google Spreadsheet Account
                      </button>
                    ) : (
                      <>
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "var(--text-muted)", marginBottom: 5 }}>SPREADSHEET ID (FROM URL)</label>
                          <input 
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", background: "#ffffff", color: "var(--text)", outline: "none", fontSize: "0.85rem" }} 
                            value={tempSettings.googleSheetId} 
                            onChange={e => setTempSettings({...tempSettings, googleSheetId: e.target.value})} 
                            placeholder="e.g. 1aBCDeFghIjKLmNoPQrsT..." 
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "var(--text-muted)", marginBottom: 5 }}>SHEET TAB NAME</label>
                          <input 
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", background: "#ffffff", color: "var(--text)", outline: "none", fontSize: "0.85rem" }} 
                            value={tempSettings.googleSheetName} 
                            onChange={e => setTempSettings({...tempSettings, googleSheetName: e.target.value})} 
                            placeholder="Leads" 
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Zoho CRM (Leads) */}
                {selectedNode.id === "act_crm" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {!cfg.zoho_connected ? (
                      <>
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "var(--text-muted)", marginBottom: 5 }}>ZOHO REGION DOMAIN</label>
                          <select 
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", background: "#ffffff", color: "var(--text)", outline: "none", fontSize: "0.85rem" }}
                            value={tempSettings.zohoDC}
                            onChange={e => setTempSettings({...tempSettings, zohoDC: e.target.value})}
                          >
                            <option value="us">United States (zoho.com)</option>
                            <option value="eu">Europe (zoho.eu)</option>
                            <option value="in">India (zoho.in)</option>
                          </select>
                        </div>
                        <button 
                          onClick={connectZoho} 
                          style={{
                            background: colors.zoho, color: "#fff", fontWeight: 800, border: "none",
                            padding: "12px 14px", borderRadius: 12, cursor: "pointer", fontSize: "0.85rem",
                            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.15)"
                          }}
                        >
                          💼 Connect Zoho CRM Account
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ background: "var(--green-light)", padding: 10, borderRadius: 8, fontSize: "0.75rem", border: "1px solid var(--green)", color: "var(--green)" }}>
                          ✓ Zoho CRM Lead Sync is connected!
                        </div>
                        <button onClick={() => disconnectPlatform("zoho")} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, width: "fit-content", padding: 0 }}>
                          Disconnect Zoho CRM
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Email summaries */}
                {selectedNode.id === "act_email" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 750, color: "var(--text)" }}>Enable Summaries</span>
                      <input 
                        type="checkbox" 
                        checked={tempSettings.emailEnabled} 
                        onChange={e => setTempSettings({...tempSettings, emailEnabled: e.target.checked})} 
                        style={{ width: 18, height: 18, accentColor: "var(--blue)" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "var(--text-muted)", marginBottom: 5 }}>RECIPIENT EMAIL ADDRESS</label>
                      <input 
                        type="email"
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", background: "#ffffff", color: "var(--text)", outline: "none", fontSize: "0.85rem" }} 
                        value={tempSettings.contactEmail} 
                        onChange={e => setTempSettings({...tempSettings, contactEmail: e.target.value})} 
                        placeholder="you@company.com" 
                      />
                    </div>
                  </div>
                )}

                {/* Export API Webhook */}
                {selectedNode.id === "act_webhook" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "var(--text-muted)", marginBottom: 5 }}>TARGET WEBHOOK URL</label>
                      <input 
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", background: "#ffffff", color: "var(--text)", outline: "none", fontSize: "0.85rem" }} 
                        value={tempSettings.customWebhookUrl} 
                        onChange={e => setTempSettings({...tempSettings, customWebhookUrl: e.target.value})} 
                        placeholder="https://your-server.com/call-logs" 
                      />
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>🖱️</div>
              <h4 style={{ margin: "0 0 6px 0", color: "var(--text)", fontWeight: 900 }}>Journey Configurator</h4>
              <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>
                Click on any journey block in the blueprint to instantly configure parameters, check connection statuses, or authorize third-party platforms.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
