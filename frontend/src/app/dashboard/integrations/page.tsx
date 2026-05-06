"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchIntegrations, apiPatch, apiDelete } from "@/lib/api";

const getTenantId = () => {
  if (typeof document === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "00000000-0000-0000-0000-000000000000";
};

const TENANT_ID = getTenantId();
// Removed hardcoded API_URL

/* ── shared styles ─────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9, boxSizing: "border-box",
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5,
};
const hint: React.CSSProperties = { fontSize: "0.73rem", color: "#9CA3AF", marginTop: 4 };

/* ── Modal wrapper ─────────────────────────────────────────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "2rem", width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#9CA3AF" }}>✕</button>
        <h3 style={{ fontWeight: 800, color: "#064E3B", margin: "0 0 1.5rem", fontSize: "1.1rem" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ── Status badge ──────────────────────────────────────────────── */
function Badge({ connected }: { connected: boolean }) {
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, letterSpacing: 0.3,
      background: connected ? "#ECFDF5" : "#F3F4F6",
      color: connected ? "#059669" : "#9CA3AF",
      border: `1px solid ${connected ? "#D1FAE5" : "#E5E7EB"}`,
    }}>
      {connected ? "● CONNECTED" : "NOT CONNECTED"}
    </span>
  );
}

/* ── Integration card ──────────────────────────────────────────── */
function IntCard({ icon, title, description, connected, onConnect, onDisconnect }: {
  icon: string; title: string; description: string;
  connected: boolean; onConnect: () => void; onDisconnect: () => void;
}) {
  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${connected ? "#A7F3D0" : "#D1FAE5"}`,
      borderRadius: 16, padding: "1.75rem",
      boxShadow: connected ? "0 4px 20px rgba(16,185,129,0.12)" : "0 2px 10px rgba(16,185,129,0.06)",
      display: "flex", flexDirection: "column", gap: "1rem",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: connected ? "linear-gradient(135deg,#064E3B,#10B981)" : "#F3F4F6",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
          transition: "background 0.3s",
        }}>{icon}</div>
        <Badge connected={connected} />
      </div>

      {/* Body */}
      <div>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: "0.83rem", color: "#6B7280", lineHeight: 1.6 }}>{description}</div>
      </div>

      {/* Footer — always visible */}
      <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
        <button onClick={onConnect} style={{
          flex: 1, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem",
          cursor: "pointer", border: "none", transition: "all 0.2s",
          background: connected ? "#F6FEFA" : "#064E3B",
          color: connected ? "#059669" : "#fff",
          boxShadow: connected ? "none" : "0 4px 12px rgba(6,78,59,0.25)",
        }}>
          {connected ? "⚙️ Manage" : "Connect"}
        </button>
        {connected && (
          <button onClick={onDisconnect} style={{
            padding: "10px 14px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem",
            cursor: "pointer", border: "1.5px solid #FECACA", background: "#FFF5F5",
            color: "#DC2626", transition: "all 0.2s",
          }}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function IntegrationsPage() {
  const [cfg, setCfg]     = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Modal open state
  const [modal, setModal] = useState<"shopify" | "zoho" | "webhook" | "email" | null>(null);

  // Form fields
  const [shopifyUrl, setShopifyUrl]     = useState("");
  const [shopifyKey, setShopifyKey]     = useState("");
  const [zohoToken, setZohoToken]       = useState("");
  const [zohoOrg, setZohoOrg]           = useState("");
  const [webhookUrl, setWebhookUrl]     = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [contactEmail, setContactEmail] = useState("");

  /* ── Load current settings ── */
  const load = useCallback(async () => {
    try {
      const data = await fetchIntegrations(TENANT_ID);
      if (data) {
        setCfg(data);
        setShopifyUrl(data.shopify_store_url || "");
        setShopifyKey(data.shopify_api_key   || "");
        setZohoToken(data.zoho_access_token  || "");
        setZohoOrg(data.zoho_org_id          || "");
        setWebhookUrl(data.webhook_url       || "");
        setEmailEnabled(data.email_summary_enabled ?? true);
        setContactEmail(data.contact_email || "");
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  /* ── Save helpers ── */
  const save = async (patch: Record<string, any>) => {
    setSaving(true);
    try {
      await apiPatch(`/integrations?tenant_id=${TENANT_ID}`, patch);
      await load(); setModal(null); showToast("✅ Settings saved!");
    } catch { showToast("⚠️ Failed to save — check your credentials."); }
    setSaving(false);
  };

  const disconnect = async (key: string) => {
    setSaving(true);
    try {
      await apiDelete(`/integrations/${key}?tenant_id=${TENANT_ID}`);
      await load(); showToast(`🔌 ${key} disconnected.`);
    } catch {}
    setSaving(false);
  };

  /* ── Derived connected states ── */
  const shopifyConnected  = !!(cfg.shopify_store_url);
  const zohoConnected     = !!(cfg.zoho_access_token);
  const webhookConnected  = !!(cfg.webhook_url);
  const emailConnected    = !!(cfg.email_summary_enabled);



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 2000,
          background: "#064E3B", color: "#fff", borderRadius: 12,
          padding: "12px 20px", fontWeight: 700, fontSize: "0.9rem",
          boxShadow: "0 8px 30px rgba(6,78,59,0.35)",
          animation: "fadeIn 0.2s ease",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>
          Integrations Hub
        </h1>
        <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>
          Connect your AI workforce to your existing business tools.
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>

        {/* ── Shopify ── */}
        <IntCard
          icon="🛍️" title="Shopify" connected={shopifyConnected}
          description="Let your AI check real-time order status and inventory directly from your Shopify store during calls."
          onConnect={() => setModal("shopify")}
          onDisconnect={() => disconnect("shopify")}
        />

        {/* ── Zoho CRM ── */}
        <IntCard
          icon="💼" title="Zoho CRM" connected={zohoConnected}
          description="Automatically create leads and log call transcripts directly into your Zoho account after every conversation."
          onConnect={() => setModal("zoho")}
          onDisconnect={() => disconnect("zoho")}
        />

        {/* ── Webhook ── */}
        <IntCard
          icon="⚡" title="Zapier / Webhooks" connected={webhookConnected}
          description="Send a full payload (summary, sentiment, transcript) to any custom webhook URL when a call ends — works with Zapier, Make.com, n8n."
          onConnect={() => setModal("webhook")}
          onDisconnect={() => disconnect("webhook")}
        />

        {/* ── Email Summary ── */}
        <IntCard
          icon="📧" title="Email Summaries" connected={emailConnected}
          description="Automatically receive beautiful call reports via email. Defaulted to your Google Account address."
          onConnect={() => setModal("email")}
          onDisconnect={() => save({ email_summary_enabled: false })}
        />
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════ */}

      {/* Shopify Modal */}
      <Modal open={modal === "shopify"} onClose={() => setModal(null)} title="🛍️ Connect Shopify">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.6 }}>
            <strong>How to get your API key:</strong><br />
            Shopify Admin → Settings → Apps and sales channels → Develop apps → Create app → API credentials
          </div>
          <div>
            <label style={lbl}>Store URL *</label>
            <input type="url" value={shopifyUrl} onChange={e => setShopifyUrl(e.target.value)}
              placeholder="https://your-store.myshopify.com" style={inp} />
          </div>
          <div>
            <label style={lbl}>Admin API Access Token *</label>
            <input type="password" value={shopifyKey} onChange={e => setShopifyKey(e.target.value)}
              placeholder="shpat_••••••••••••••••" style={inp} />
            <p style={hint}>Your token is encrypted and never exposed to the frontend.</p>
          </div>
          <button
            disabled={saving || !shopifyUrl || !shopifyKey}
            onClick={() => save({ shopify_store_url: shopifyUrl, shopify_api_key: shopifyKey })}
            style={{ width: "100%", background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save & Connect Shopify"}
          </button>
        </div>
      </Modal>

      {/* Zoho Modal */}
      <Modal open={modal === "zoho"} onClose={() => setModal(null)} title="💼 Connect Zoho CRM">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.6 }}>
            <strong>How to get your token:</strong><br />
            Zoho API Console → Server-based apps → Generate token → Copy Access Token and Org ID
          </div>
          <div>
            <label style={lbl}>Zoho Access Token *</label>
            <input type="password" value={zohoToken} onChange={e => setZohoToken(e.target.value)}
              placeholder="1000.••••••••••••••••" style={inp} />
          </div>
          <div>
            <label style={lbl}>Organisation ID</label>
            <input type="text" value={zohoOrg} onChange={e => setZohoOrg(e.target.value)}
              placeholder="e.g. 20078901234" style={inp} />
            <p style={hint}>Found in Zoho CRM → Setup → Company Details</p>
          </div>
          <button
            disabled={saving || !zohoToken}
            onClick={() => save({ zoho_access_token: zohoToken, zoho_org_id: zohoOrg })}
            style={{ width: "100%", background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save & Connect Zoho"}
          </button>
        </div>
      </Modal>



      {/* Webhook Modal */}
      <Modal open={modal === "webhook"} onClose={() => setModal(null)} title="⚡ Configure Webhook">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.6 }}>
            When a call ends, we POST a JSON payload to your URL containing:<br />
            <code style={{ fontSize: "0.78rem" }}>call_id, phone, transcript, summary, sentiment, action_items</code>
          </div>
          <div>
            <label style={lbl}>Webhook URL *</label>
            <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..." style={inp} />
            <p style={hint}>Works with Zapier, Make.com, n8n, or any custom endpoint.</p>
          </div>

          {/* Sample payload */}
          <div>
            <label style={lbl}>Sample Payload</label>
            <pre style={{
              background: "#0F172A", color: "#6EE7B7", borderRadius: 10, padding: "14px",
              fontSize: "0.72rem", lineHeight: 1.7, overflowX: "auto", margin: 0,
            }}>{`{
  "call_id": "abc-123",
  "phone": "+12125550100",
  "transcript": "Caller asked about pricing...",
  "summary": "Customer interested in Pro plan",
  "sentiment": "positive",
  "action_items": "Send pricing email"
}`}</pre>
          </div>

          <button
            disabled={saving || !webhookUrl}
            onClick={() => save({ webhook_url: webhookUrl })}
            style={{ width: "100%", background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Webhook URL"}
          </button>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal open={modal === "email"} onClose={() => setModal(null)} title="📧 Email Summary Settings">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.7 }}>
            By default, we send a <strong>beautiful AI-generated call report</strong> to your Google Account email after every conversation.
          </div>

          <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontWeight: 700, color: "#059669", marginBottom: 4 }}>Destination Email:</div>
            <div style={{ fontSize: "0.88rem", color: "#064E3B", fontFamily: "monospace" }}>{contactEmail}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0" }}>
            <span style={{ fontWeight: 700, color: "#064E3B", fontSize: "0.9rem" }}>Enable Email Summaries</span>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={e => setEmailEnabled(e.target.checked)}
              style={{ width: 22, height: 22, accentColor: "#064E3B", cursor: "pointer" }}
            />
          </div>

          <button
            disabled={saving}
            onClick={() => save({ email_summary_enabled: emailEnabled })}
            style={{ width: "100%", background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Updating..." : "Save Preferences"}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }`}</style>
    </div>
  );
}
