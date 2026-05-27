"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchIntegrations, apiPatch, API_BASE_URL, getTenantId } from "@/lib/api";

/* ─── STYLES ──────────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1.5px solid var(--border)", fontSize: "0.88rem",
  outline: "none", fontFamily: "inherit", color: "var(--text)",
  boxSizing: "border-box", background: "#fff",
  transition: "border-color 0.2s",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 700,
  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
};
const cardBase: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid var(--border)",
  borderRadius: 16,
  padding: "1.5rem",
  transition: "all 0.25s ease",
  position: "relative",
  overflow: "hidden",
};

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "AIxCaller_Alerts_Bot";

/* ─── STATUS BADGE ─────────────────────────────────────────────── */
function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700,
      letterSpacing: 0.3, textTransform: "uppercase",
      background: connected ? "var(--green-light)" : "var(--surface)",
      color: connected ? "var(--green)" : "var(--text-muted)",
      border: `1px solid ${connected ? "rgba(5,150,105,0.2)" : "var(--border)"}`,
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: connected ? "var(--green)" : "var(--text-muted)",
        boxShadow: connected ? "0 0 6px rgba(5,150,105,0.4)" : "none",
      }} />
      {label || (connected ? "Connected" : "Not connected")}
    </div>
  );
}

/* ─── COMING SOON BADGE ─────────────────────────────────────────── */
function ComingSoonBadge() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 99, fontSize: "0.68rem", fontWeight: 800,
      letterSpacing: 0.4, textTransform: "uppercase",
      background: "linear-gradient(135deg, #fef3c7, #fde68a)",
      color: "#92400e",
      border: "1px solid rgba(217,119,6,0.2)",
      boxShadow: "0 1px 4px rgba(217,119,6,0.08)",
    }}>
      ✨ Coming Soon
    </div>
  );
}

/* ─── INTEGRATION CARD WRAPPER ─────────────────────────────────── */
function IntegrationCard({ icon, title, description, connected, accentColor, comingSoon, children }: {
  icon: string; title: string; description: string; connected: boolean; accentColor: string;
  comingSoon?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      ...cardBase,
      borderColor: connected ? `${accentColor}40` : comingSoon ? "rgba(217,119,6,0.15)" : "var(--border)",
      boxShadow: connected ? `0 4px 20px ${accentColor}08` : "0 2px 8px rgba(0,0,0,0.02)",
      opacity: comingSoon ? 0.92 : 1,
    }}>
      {/* Accent top strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: connected ? accentColor : comingSoon ? "linear-gradient(90deg, #f59e0b, #d97706)" : "transparent",
        transition: "background 0.3s",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: connected ? `${accentColor}10` : comingSoon ? "#fffbeb" : "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", flexShrink: 0,
            border: `1.5px solid ${connected ? `${accentColor}25` : comingSoon ? "rgba(217,119,6,0.15)" : "var(--border)"}`,
            transition: "all 0.25s",
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{description}</div>
          </div>
        </div>
        {comingSoon ? <ComingSoonBadge /> : <StatusBadge connected={connected} />}
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {children}
      </div>
    </div>
  );
}

/* ─── CALL FLOW STEP ───────────────────────────────────────────── */
function FlowStep({ icon, label, active, color }: { icon: string; label: string; active: boolean; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      opacity: active ? 1 : 0.4, transition: "opacity 0.3s",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: active ? `${color}12` : "var(--surface)",
        border: `1.5px solid ${active ? `${color}30` : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.1rem",
      }}>
        {icon}
      </div>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: active ? color : "var(--text-muted)", textAlign: "center", lineHeight: 1.2, maxWidth: 80 }}>
        {label}
      </span>
    </div>
  );
}

function FlowArrow({ active, color }: { active: boolean; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, marginTop: -16 }}>
      <svg width="32" height="10" style={{ overflow: "visible" }}>
        <line x1="0" y1="5" x2="24" y2="5" stroke={active ? color : "var(--border)"} strokeWidth={active ? 2 : 1.5} strokeDasharray={active ? "none" : "4 3"} />
        <polygon points="32,5 24,1 24,9" fill={active ? color : "var(--border)"} />
      </svg>
    </div>
  );
}

/* ─── MAIN PAGE ────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const [cfg, setCfg] = useState<any>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const [settings, setSettings] = useState({
    googleCalendarId: "primary",
    emailEnabled: true,
    contactEmail: "",
    airtablePat: "",
    airtableBaseId: "",
    airtableTableName: "Call Log",
    shopifyStoreUrl: "",
    shopifyApiKey: "",
    webhookUrl: "",
  });
  const [airtableTesting, setAirtableTesting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = useCallback(async () => {
    try {
      const data = await fetchIntegrations(getTenantId());
      if (data) {
        setCfg(data);
        setSettings(prev => ({
          ...prev,
          googleCalendarId: data.google_calendar_id || "primary",
          emailEnabled: data.email_summary_enabled ?? true,
          contactEmail: data.contact_email || "",
          airtablePat: "",  // never expose token back
          airtableBaseId: data.airtable_base_id || "",
          airtableTableName: data.airtable_table_name || "Call Log",
          shopifyStoreUrl: data.shopify_store_url || "",
          shopifyApiKey: "", // never expose token back
          webhookUrl: data.webhook_url || "",
        }));
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ─── OAuth Actions ─── */
  const connectGoogle = () => {
    window.location.href = `${API_BASE_URL}/google/install?tenant_id=${getTenantId()}`;
  };

  const disconnectGoogle = async () => {
    setSaving("google");
    try {
      await fetch(`${API_BASE_URL}/google/disconnect?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load();
      showToast("✅ Google disconnected");
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(null);
  };

  /* ─── Google Calendar save ─── */
  const saveGoogleSettings = async () => {
    setSaving("google");
    try {
      await fetch(`${API_BASE_URL}/google/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: getTenantId(), calendar_id: settings.googleCalendarId }),
      });
      showToast("✅ Google Calendar settings saved!");
    } catch {
      showToast("⚠️ Failed to save Google settings.");
    }
    setSaving(null);
  };

  /* ─── Email settings save ─── */
  const saveEmailSettings = async () => {
    setSaving("email");
    try {
      await apiPatch(`/integrations?tenant_id=${getTenantId()}`, {
        email_summary_enabled: settings.emailEnabled,
        contact_email: settings.contactEmail || null,
      });
      await load();
      showToast("✅ Email settings saved!");
    } catch {
      showToast("⚠️ Failed to save email settings.");
    }
    setSaving(null);
  };

  /* ─── Airtable save ─── */
  const saveAirtableSettings = async () => {
    setSaving("airtable");
    try {
      await apiPatch(`/integrations?tenant_id=${getTenantId()}`, {
        airtable_pat: settings.airtablePat || null,
        airtable_base_id: settings.airtableBaseId || null,
        airtable_table_name: settings.airtableTableName || "Call Log",
      });
      await load();
      showToast("✅ Airtable settings saved!");
    } catch {
      showToast("⚠️ Failed to save Airtable settings.");
    }
    setSaving(null);
  };

  /* ─── Shopify save ─── */
  const saveShopifySettings = async () => {
    setSaving("shopify");
    try {
      await apiPatch(`/integrations?tenant_id=${getTenantId()}`, {
        shopify_store_url: settings.shopifyStoreUrl || null,
        shopify_api_key: settings.shopifyApiKey || null,
      });
      await load();
      showToast("✅ Shopify settings saved!");
    } catch {
      showToast("⚠️ Failed to save Shopify settings.");
    }
    setSaving(null);
  };

  const disconnectShopify = async () => {
    setSaving("shopify");
    try {
      await fetch(`${API_BASE_URL}/integrations/shopify?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load();
      setSettings(prev => ({ ...prev, shopifyStoreUrl: "", shopifyApiKey: "" }));
      showToast("✅ Shopify disconnected");
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(null);
  };

  /* ─── Webhook save ─── */
  const saveWebhookSettings = async () => {
    setSaving("webhook");
    try {
      await apiPatch(`/integrations?tenant_id=${getTenantId()}`, {
        webhook_url: settings.webhookUrl || null,
      });
      await load();
      showToast("✅ Webhook URL saved!");
    } catch {
      showToast("⚠️ Failed to save Webhook URL.");
    }
    setSaving(null);
  };

  const disconnectWebhook = async () => {
    setSaving("webhook");
    try {
      await fetch(`${API_BASE_URL}/integrations/webhook?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load();
      setSettings(prev => ({ ...prev, webhookUrl: "" }));
      showToast("✅ Webhook disconnected");
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(null);
  };

  /* ─── HubSpot & Salesforce OAuth ─── */
  const connectHubspot = () => {
    window.location.href = `${API_BASE_URL}/hubspot/install?tenant_id=${getTenantId()}`;
  };

  const disconnectHubspot = async () => {
    setSaving("hubspot");
    try {
      await fetch(`${API_BASE_URL}/integrations/hubspot?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load();
      showToast("✅ HubSpot disconnected");
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(null);
  };

  const connectSalesforce = () => {
    window.location.href = `${API_BASE_URL}/salesforce/install?tenant_id=${getTenantId()}`;
  };

  const disconnectSalesforce = async () => {
    setSaving("salesforce");
    try {
      await fetch(`${API_BASE_URL}/integrations/salesforce?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load();
      showToast("✅ Salesforce disconnected");
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(null);
  };

  const testAirtable = async () => {
    setAirtableTesting(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/integrations/airtable/test?tenant_id=${getTenantId()}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        showToast(`✅ Airtable connected! Table: ${data.table}`);
      } else {
        showToast(`⚠️ ${data.detail || "Connection failed"}`);
      }
    } catch {
      showToast("⚠️ Connection test failed.");
    }
    setAirtableTesting(false);
  };

  const disconnectAirtable = async () => {
    setSaving("airtable");
    try {
      await fetch(`${API_BASE_URL}/integrations/airtable?tenant_id=${getTenantId()}`, { method: "DELETE" });
      await load();
      setSettings(prev => ({ ...prev, airtablePat: "", airtableBaseId: "", airtableTableName: "Call Log" }));
      showToast("✅ Airtable disconnected");
    } catch {
      showToast("⚠️ Disconnect failed.");
    }
    setSaving(null);
  };

  const tenantId = getTenantId();
  const telegramDeepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${tenantId}`;

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .int-card { animation: fadeInUp 0.35s ease both; }
        .int-card:nth-child(2) { animation-delay: 0.06s; }
        .int-card:nth-child(3) { animation-delay: 0.12s; }
        .int-card:nth-child(4) { animation-delay: 0.18s; }
        .int-card:nth-child(5) { animation-delay: 0.24s; }
        .int-btn { transition: all 0.2s; }
        .int-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
        .int-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 3000,
          background: toast.includes("⚠️") ? "#ef4444" : "var(--green)",
          color: "#fff", borderRadius: 12, padding: "14px 22px",
          fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", fontSize: "0.88rem",
          animation: "fadeInUp 0.2s ease",
        }}>{toast}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* ── Header ── */}
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>
            Integrations
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Connect your tools to supercharge your AI agents. Each integration is configured independently.
          </p>
        </div>

        {/* ── Integration Cards Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>

          {/* ── Google Workspace ── */}
          <div className="int-card">
            <IntegrationCard
              icon="🗓️" title="Google Workspace" description="Calendar booking & availability"
              connected={!!cfg.google_connected} accentColor="#2563eb"
            >
              {cfg.google_connected ? (
                <>
                  <div style={{
                    background: "var(--blue-light)", border: "1px solid rgba(29,78,216,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "var(--blue)", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>✓</span> Google Calendar connected — bookings are live
                  </div>
                  <div>
                    <label style={lbl}>Calendar ID</label>
                    <input
                      style={inp} value={settings.googleCalendarId}
                      onChange={e => setSettings({ ...settings, googleCalendarId: e.target.value })}
                      placeholder="primary"
                      onFocus={e => e.target.style.borderColor = "#2563eb"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                      Use &quot;primary&quot; for your main calendar, or paste a specific Google Calendar ID.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="int-btn" onClick={saveGoogleSettings} disabled={saving === "google"}
                      style={{
                        flex: 1, background: "#2563eb", color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                        boxShadow: "0 2px 8px rgba(37,99,235,0.2)", opacity: saving === "google" ? 0.7 : 1,
                      }}
                    >
                      {saving === "google" ? "Saving…" : "Save Settings"}
                    </button>
                    <button
                      className="int-btn" onClick={disconnectGoogle} disabled={saving === "google"}
                      style={{
                        background: "none", border: "1.5px solid #fecaca", color: "#ef4444",
                        borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Connect Google to let your AI agent check calendar availability and book appointments during calls.
                  </div>
                  <button
                    className="int-btn" onClick={connectGoogle}
                    style={{
                      width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10,
                      padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.2)",
                    }}
                  >
                    🔗 Connect Google Workspace
                  </button>
                </>
              )}
            </IntegrationCard>
          </div>

          {/* ── HubSpot CRM ── */}
          <div className="int-card">
            <IntegrationCard
              icon="🟠" title="HubSpot CRM" description="Automatic lead & deal sync"
              connected={!!cfg.hubspot_connected} accentColor="#ff7a59"
            >
              {cfg.hubspot_connected ? (
                <>
                  <div style={{
                    background: "#fff7ed", border: "1px solid rgba(255,122,89,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#9a3412", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>✓</span> HubSpot connected securely
                  </div>
                  <button
                    className="int-btn" onClick={disconnectHubspot} disabled={saving === "hubspot"}
                    style={{
                      width: "100%", background: "none", border: "1.5px solid #fecaca", color: "#ef4444",
                      borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                      marginTop: 10,
                    }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Automatically push leads, call transcripts, and deal updates to your HubSpot CRM after every AI call.
                  </div>
                  <button
                    className="int-btn" onClick={connectHubspot}
                    style={{
                      width: "100%", background: "#ff7a59", color: "#fff", border: "none", borderRadius: 10,
                      padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                      boxShadow: "0 4px 14px rgba(255,122,89,0.2)",
                    }}
                  >
                    🔗 Connect HubSpot
                  </button>
                </>
              )}
            </IntegrationCard>
          </div>

          {/* ── Salesforce ── */}
          <div className="int-card">
            <IntegrationCard
              icon="☁️" title="Salesforce" description="Enterprise CRM sync"
              connected={!!cfg.salesforce_connected} accentColor="#00a1e0"
            >
              {cfg.salesforce_connected ? (
                <>
                  <div style={{
                    background: "#f0f9ff", border: "1px solid rgba(0,161,224,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#0c4a6e", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>✓</span> Salesforce connected securely
                  </div>
                  <button
                    className="int-btn" onClick={disconnectSalesforce} disabled={saving === "salesforce"}
                    style={{
                      width: "100%", background: "none", border: "1.5px solid #fecaca", color: "#ef4444",
                      borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                      marginTop: 10,
                    }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Sync leads, opportunities, and call activity directly to your Salesforce org. Built for enterprise teams.
                  </div>
                  <button
                    className="int-btn" onClick={connectSalesforce}
                    style={{
                      width: "100%", background: "#00a1e0", color: "#fff", border: "none", borderRadius: 10,
                      padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                      boxShadow: "0 4px 14px rgba(0,161,224,0.2)",
                    }}
                  >
                    🔗 Connect Salesforce
                  </button>
                </>
              )}
            </IntegrationCard>
          </div>

          {/* ── Shopify ── */}
          <div className="int-card">
            <IntegrationCard
              icon="🛍️" title="Shopify" description="Real-time order & inventory checks"
              connected={!!cfg.shopify_store_url} accentColor="#10b981"
            >
              {cfg.shopify_store_url ? (
                <>
                  <div style={{
                    background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#047857", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>✓</span> Connected to {cfg.shopify_store_url}
                  </div>
                  <div>
                    <label style={lbl}>Admin API Access Token (update)</label>
                    <input
                      type="password" style={inp} value={settings.shopifyApiKey}
                      onChange={e => setSettings({ ...settings, shopifyApiKey: e.target.value })}
                      placeholder="shpat_•••••••• (leave blank to keep current)"
                      onFocus={e => e.target.style.borderColor = "#10b981"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="int-btn" onClick={saveShopifySettings} disabled={saving === "shopify" || !settings.shopifyApiKey}
                      style={{
                        flex: 1, background: "#10b981", color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                        boxShadow: "0 2px 8px rgba(16,185,129,0.2)", opacity: (saving === "shopify" || !settings.shopifyApiKey) ? 0.7 : 1,
                      }}
                    >
                      {saving === "shopify" ? "Saving…" : "Save Token"}
                    </button>
                    <button
                      className="int-btn" onClick={disconnectShopify} disabled={saving === "shopify"}
                      style={{
                        background: "none", border: "1.5px solid #fecaca", color: "#ef4444",
                        borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Let your AI check real-time order status and inventory directly from your Shopify store during calls.
                  </div>
                  <div>
                    <label style={lbl}>Store URL</label>
                    <input
                      style={inp} value={settings.shopifyStoreUrl}
                      onChange={e => setSettings({ ...settings, shopifyStoreUrl: e.target.value })}
                      placeholder="your-store.myshopify.com"
                      onFocus={e => e.target.style.borderColor = "#10b981"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Admin API Access Token</label>
                    <input
                      type="password" style={inp} value={settings.shopifyApiKey}
                      onChange={e => setSettings({ ...settings, shopifyApiKey: e.target.value })}
                      placeholder="shpat_••••••••"
                      onFocus={e => e.target.style.borderColor = "#10b981"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <button
                    className="int-btn" onClick={saveShopifySettings}
                    disabled={!settings.shopifyStoreUrl || !settings.shopifyApiKey || saving === "shopify"}
                    style={{
                      width: "100%", background: "#10b981", color: "#fff", border: "none", borderRadius: 10,
                      padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                      boxShadow: "0 4px 14px rgba(16,185,129,0.2)",
                      opacity: (!settings.shopifyStoreUrl || !settings.shopifyApiKey || saving === "shopify") ? 0.5 : 1,
                    }}
                  >
                    {saving === "shopify" ? "Saving…" : "💾 Save & Connect"}
                  </button>
                </>
              )}
            </IntegrationCard>
          </div>

          {/* ── Custom Webhook ── */}
          <div className="int-card">
            <IntegrationCard
              icon="🔗" title="Custom Webhook" description="Send data to Zapier/Make"
              connected={!!cfg.webhook_url} accentColor="#8b5cf6"
            >
              {cfg.webhook_url ? (
                <>
                  <div style={{
                    background: "#f5f3ff", border: "1px solid rgba(139,92,246,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#5b21b6", fontWeight: 600,
                    wordBreak: "break-all"
                  }}>
                    <span>✓</span> {cfg.webhook_url}
                  </div>
                  <div>
                    <label style={lbl}>Update Webhook URL</label>
                    <input
                      style={inp} value={settings.webhookUrl}
                      onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
                      placeholder="https://hooks.zapier.com/..."
                      onFocus={e => e.target.style.borderColor = "#8b5cf6"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="int-btn" onClick={saveWebhookSettings} disabled={saving === "webhook"}
                      style={{
                        flex: 1, background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                        boxShadow: "0 2px 8px rgba(139,92,246,0.2)", opacity: saving === "webhook" ? 0.7 : 1,
                      }}
                    >
                      {saving === "webhook" ? "Saving…" : "Save URL"}
                    </button>
                    <button
                      className="int-btn" onClick={disconnectWebhook} disabled={saving === "webhook"}
                      style={{
                        background: "none", border: "1.5px solid #fecaca", color: "#ef4444",
                        borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Send a POST request with the call transcript, summary, and sentiment to any custom URL instantly after a call ends.
                  </div>
                  <div>
                    <label style={lbl}>Webhook URL</label>
                    <input
                      style={inp} value={settings.webhookUrl}
                      onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
                      placeholder="https://hooks.zapier.com/..."
                      onFocus={e => e.target.style.borderColor = "#8b5cf6"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <button
                    className="int-btn" onClick={saveWebhookSettings}
                    disabled={!settings.webhookUrl || saving === "webhook"}
                    style={{
                      width: "100%", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 10,
                      padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                      boxShadow: "0 4px 14px rgba(139,92,246,0.2)",
                      opacity: (!settings.webhookUrl || saving === "webhook") ? 0.5 : 1,
                    }}
                  >
                    {saving === "webhook" ? "Saving…" : "🔗 Connect Webhook"}
                  </button>
                </>
              )}
            </IntegrationCard>
          </div>

          {/* ── Airtable ── */}
          <div className="int-card">
            <IntegrationCard
              icon="📊" title="Airtable" description="Auto-log calls to your base"
              connected={!!cfg.airtable_connected} accentColor="#18bfff"
            >
              {cfg.airtable_connected ? (
                <>
                  <div style={{
                    background: "#ecfeff", border: "1px solid rgba(24,191,255,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#0891b2", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>✓</span> Every call auto-logged to "{cfg.airtable_table_name || "Call Log"}"
                  </div>
                  <div>
                    <label style={lbl}>Base ID</label>
                    <input
                      style={inp} value={settings.airtableBaseId}
                      onChange={e => setSettings({ ...settings, airtableBaseId: e.target.value })}
                      placeholder="appXXXXXXXXXXXXXX"
                      onFocus={e => e.target.style.borderColor = "#18bfff"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Table Name</label>
                    <input
                      style={inp} value={settings.airtableTableName}
                      onChange={e => setSettings({ ...settings, airtableTableName: e.target.value })}
                      placeholder="Call Log"
                      onFocus={e => e.target.style.borderColor = "#18bfff"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Personal Access Token (update)</label>
                    <input
                      type="password" style={inp} value={settings.airtablePat}
                      onChange={e => setSettings({ ...settings, airtablePat: e.target.value })}
                      placeholder="pat•••••••• (leave blank to keep current)"
                      onFocus={e => e.target.style.borderColor = "#18bfff"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="int-btn" onClick={saveAirtableSettings} disabled={saving === "airtable"}
                      style={{
                        flex: 1, background: "#18bfff", color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                        boxShadow: "0 2px 8px rgba(24,191,255,0.2)", opacity: saving === "airtable" ? 0.7 : 1,
                      }}
                    >
                      {saving === "airtable" ? "Saving…" : "Save Settings"}
                    </button>
                    <button
                      className="int-btn" onClick={testAirtable} disabled={airtableTesting}
                      style={{
                        background: "none", border: "1.5px solid #18bfff", color: "#18bfff",
                        borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                        opacity: airtableTesting ? 0.6 : 1,
                      }}
                    >
                      {airtableTesting ? "Testing…" : "Test"}
                    </button>
                    <button
                      className="int-btn" onClick={disconnectAirtable} disabled={saving === "airtable"}
                      style={{
                        background: "none", border: "1.5px solid #fecaca", color: "#ef4444",
                        borderRadius: 10, padding: "10px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Auto-log every call to your Airtable base. Phone, summary, sentiment, duration, and action items — all captured as a row.
                  </div>
                  <div style={{
                    background: "#ecfeff", border: "1px solid rgba(24,191,255,0.15)",
                    borderRadius: 10, padding: "10px 14px", fontSize: "0.78rem", color: "#155e75", lineHeight: 1.5,
                  }}>
                    <strong>How to connect:</strong><br />
                    1. Go to <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" style={{ color: "#0891b2", fontWeight: 700 }}>airtable.com/create/tokens</a><br />
                    2. Create a token with scopes: <strong>data.records:write</strong>, <strong>data.records:read</strong><br />
                    3. Grant access to the base you want to log calls to<br />
                    4. Create a table named &quot;Call Log&quot; with columns: Phone, Summary, Sentiment, Duration (s), Action Items, Agent, Call ID, Timestamp
                  </div>
                  <div>
                    <label style={lbl}>Personal Access Token</label>
                    <input
                      type="password" style={inp} value={settings.airtablePat}
                      onChange={e => setSettings({ ...settings, airtablePat: e.target.value })}
                      placeholder="patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX"
                      onFocus={e => e.target.style.borderColor = "#18bfff"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Base ID</label>
                    <input
                      style={inp} value={settings.airtableBaseId}
                      onChange={e => setSettings({ ...settings, airtableBaseId: e.target.value })}
                      placeholder="appXXXXXXXXXXXXXX"
                      onFocus={e => e.target.style.borderColor = "#18bfff"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                      Find this in your Airtable base URL: airtable.com/<strong>appXXXXXXXX</strong>/...
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Table Name</label>
                    <input
                      style={inp} value={settings.airtableTableName}
                      onChange={e => setSettings({ ...settings, airtableTableName: e.target.value })}
                      placeholder="Call Log"
                      onFocus={e => e.target.style.borderColor = "#18bfff"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="int-btn" onClick={saveAirtableSettings}
                      disabled={!settings.airtablePat || !settings.airtableBaseId || saving === "airtable"}
                      style={{
                        flex: 1, background: "#18bfff", color: "#fff", border: "none", borderRadius: 10,
                        padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                        boxShadow: "0 4px 14px rgba(24,191,255,0.2)",
                        opacity: (!settings.airtablePat || !settings.airtableBaseId || saving === "airtable") ? 0.5 : 1,
                      }}
                    >
                      {saving === "airtable" ? "Saving…" : "💾 Save & Connect"}
                    </button>
                    <button
                      className="int-btn" onClick={testAirtable}
                      disabled={!cfg.airtable_connected || airtableTesting}
                      style={{
                        background: "none", border: "1.5px solid #18bfff", color: "#18bfff",
                        borderRadius: 10, padding: "11px 16px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                        opacity: (!cfg.airtable_connected || airtableTesting) ? 0.5 : 1,
                      }}
                    >
                      {airtableTesting ? "Testing…" : "🧪 Test"}
                    </button>
                  </div>
                </>
              )}
            </IntegrationCard>
          </div>

          {/* ── Telegram Alerts ── */}
          <div className="int-card">
            <IntegrationCard
              icon="✈️" title="Telegram Alerts" description="Real-time call notifications"
              connected={!!cfg.telegram_chat_id} accentColor="#0ea5e9"
            >
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Get instant Telegram notifications when your AI agent handles a call — with caller info, duration, and summary.
              </div>
              <div style={{
                background: "#f0f9ff", border: "1px solid rgba(14,165,233,0.15)",
                borderRadius: 10, padding: "12px 14px", fontSize: "0.78rem", color: "#0369a1", lineHeight: 1.5,
              }}>
                <strong>How to connect:</strong><br />
                1. Click the button below to open the bot<br />
                2. Press <strong>Start</strong> in Telegram<br />
                3. Your account will be linked automatically
              </div>
              <a
                href={telegramDeepLink} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <button
                  className="int-btn"
                  style={{
                    width: "100%", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10,
                    padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
                    boxShadow: "0 4px 14px rgba(14,165,233,0.2)",
                  }}
                >
                  💬 Open @{TELEGRAM_BOT_USERNAME}
                </button>
              </a>
            </IntegrationCard>
          </div>

          {/* ── Email Summaries ── */}
          <div className="int-card">
            <IntegrationCard
              icon="📧" title="Email Summaries" description="Post-call reports to your inbox"
              connected={!!(settings.emailEnabled && settings.contactEmail)} accentColor="#db2777"
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "#fdf2f8", borderRadius: 10,
                border: "1px solid rgba(219,39,119,0.12)",
              }}>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>Send summaries after each call</span>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox" checked={settings.emailEnabled}
                    onChange={e => setSettings({ ...settings, emailEnabled: e.target.checked })}
                    style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
                  />
                  <div style={{
                    width: 42, height: 24, borderRadius: 99, transition: "background 0.2s",
                    background: settings.emailEnabled ? "#db2777" : "#e2e8f0",
                    position: "relative",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 3,
                      left: settings.emailEnabled ? 21 : 3,
                      transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }} />
                  </div>
                </label>
              </div>
              <div>
                <label style={lbl}>Recipient Email</label>
                <input
                  type="email" style={inp} value={settings.contactEmail}
                  onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="you@company.com"
                  onFocus={e => e.target.style.borderColor = "#db2777"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              <button
                className="int-btn" onClick={saveEmailSettings} disabled={saving === "email"}
                style={{
                  width: "100%", background: "#db2777", color: "#fff", border: "none", borderRadius: 10,
                  padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
                  boxShadow: "0 2px 8px rgba(219,39,119,0.2)", opacity: saving === "email" ? 0.7 : 1,
                }}
              >
                {saving === "email" ? "Saving…" : "Save Email Settings"}
              </button>
            </IntegrationCard>
          </div>
        </div>

        {/* ── Call Flow Visualization (read-only) ── */}
        <div style={{
          ...cardBase, padding: "1.5rem 2rem",
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", marginBottom: 2 }}>
              Call Flow — Active Integrations
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              This shows how your connected integrations plug into each call lifecycle.
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8, overflowX: "auto",
            padding: "0.5rem 0",
          }}>
            <FlowStep icon="📞" label="Call arrives" active={true} color="var(--green)" />
            <FlowArrow active={true} color="var(--green)" />
            <FlowStep icon="🤖" label="AI answers" active={true} color="var(--blue)" />
            <FlowArrow active={!!cfg.google_connected} color="var(--blue)" />
            <FlowStep icon="🗓️" label="Book meeting" active={!!cfg.google_connected} color="#2563eb" />
            <FlowArrow active={true} color="var(--text-muted)" />
            <FlowStep icon="📝" label="Record lead" active={true} color="var(--green)" />
            <FlowArrow active={!!cfg.airtable_connected} color="#18bfff" />
            <FlowStep icon="📊" label="Airtable log" active={!!cfg.airtable_connected} color="#18bfff" />
            <FlowArrow active={!!(settings.emailEnabled && settings.contactEmail)} color="#db2777" />
            <FlowStep icon="📧" label="Email summary" active={!!(settings.emailEnabled && settings.contactEmail)} color="#db2777" />
            <FlowArrow active={!!cfg.telegram_chat_id} color="#0ea5e9" />
            <FlowStep icon="✈️" label="Telegram alert" active={!!cfg.telegram_chat_id} color="#0ea5e9" />
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="var(--blue)" strokeWidth="2" /></svg>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Not connected</span>
            </div>
          </div>
        </div>

        {/* ── Help footer ── */}
        <div style={{
          background: "var(--blue-light)", border: "1.5px dashed rgba(29,78,216,0.15)",
          borderRadius: 12, padding: "1rem 1.25rem", fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center",
        }}>
          🔧 Need help connecting? Check the <a href="/docs" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "underline" }}>Integration Guide</a> or contact support.
        </div>
      </div>
    </>
  );
}
