"use client";
import { useState, useEffect, useCallback } from "react";

const getTenantId = () => {
  if (typeof document === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "00000000-0000-0000-0000-000000000000";
};

const TENANT_ID = getTenantId();
const API_URL   = (process.env.NEXT_PUBLIC_API_URL || "https://backend-597874469660.europe-west1.run.app").replace(/\/+$/, "");
const BOT_NAME  = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "AIxCaller_Alerts_Bot";

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
  const [cfg, setCfg]     = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Modal open state
  const [modal, setModal] = useState<"shopify" | "zoho" | "telegram" | "webhook" | "resend" | null>(null);

  // Form fields
  const [shopifyUrl, setShopifyUrl]     = useState("");
  const [shopifyKey, setShopifyKey]     = useState("");
  const [zohoToken, setZohoToken]       = useState("");
  const [zohoOrg, setZohoOrg]           = useState("");
  const [tgChatId, setTgChatId]         = useState("");
  const [webhookUrl, setWebhookUrl]     = useState("");
  const [resendEmail, setResendEmail]   = useState("");

  /* ── Load current settings ── */
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/integrations?tenant_id=${TENANT_ID}`);
      if (res.ok) {
        const data = await res.json();
        setCfg(data);
        setShopifyUrl(data.shopify_store_url || "");
        setShopifyKey(data.shopify_api_key   || "");
        setZohoToken(data.zoho_access_token  || "");
        setZohoOrg(data.zoho_org_id          || "");
        setTgChatId(data.telegram_chat_id    || "");
        setWebhookUrl(data.webhook_url       || "");
        setResendEmail(data.resend_email     || "");
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  /* ── Save helpers ── */
  const save = async (patch: Record<string, string | null>) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/integrations?tenant_id=${TENANT_ID}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) { await load(); setModal(null); showToast("✅ Integration saved!"); }
      else showToast("⚠️ Failed to save — check your credentials.");
    } catch { showToast("⚠️ Network error."); }
    setSaving(false);
  };

  const disconnect = async (key: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/integrations/${key}?tenant_id=${TENANT_ID}`, { method: "DELETE" });
      if (res.ok) { await load(); showToast(`🔌 ${key} disconnected.`); }
    } catch {}
    setSaving(false);
  };

  /* ── Derived connected states ── */
  const shopifyConnected  = !!(cfg.shopify_store_url);
  const zohoConnected     = !!(cfg.zoho_access_token);
  const telegramConnected = !!(cfg.telegram_chat_id);
  const webhookConnected  = !!(cfg.webhook_url);
  const resendConnected   = !!(cfg.resend_email);

  /* ── Telegram deep link ── */
  const tgLink = `https://t.me/${BOT_NAME}?start=tenant-${TENANT_ID}`;

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

        {/* ── Telegram ── */}
        <IntCard
          icon="✈️" title="Telegram Alerts" connected={telegramConnected}
          description="Receive instant call summaries, action items, and booking details directly to your Telegram app after each call."
          onConnect={() => setModal("telegram")}
          onDisconnect={() => disconnect("telegram")}
        />

        {/* ── Webhook ── */}
        <IntCard
          icon="⚡" title="Zapier / Webhooks" connected={webhookConnected}
          description="Send a full payload (summary, sentiment, transcript) to any custom webhook URL when a call ends — works with Zapier, Make.com, n8n."
          onConnect={() => setModal("webhook")}
          onDisconnect={() => disconnect("webhook")}
        />

        {/* ── Resend Email ── */}
        <IntCard
          icon="📧" title="Summary Emails" connected={resendConnected}
          description="Automatically email a full call summary, sentiment analysis, and action items to any address after every conversation ends."
          onConnect={() => setModal("resend")}
          onDisconnect={() => disconnect("resend")}
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

      {/* Telegram Modal */}
      <Modal open={modal === "telegram"} onClose={() => setModal(null)} title="✈️ Connect Telegram Alerts">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {telegramConnected ? (
            <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, color: "#059669", marginBottom: 4 }}>✅ Telegram Connected</div>
              <div style={{ fontSize: "0.82rem", color: "#064E3B" }}>Chat ID: <code>{cfg.telegram_chat_id}</code></div>
            </div>
          ) : (
            <>
              <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.8 }}>
                <strong>Option A — Automatic (Recommended):</strong><br />
                Click the button below to open our Telegram bot and type <code>/start</code>. It auto-links your account.
              </div>
              <a href={tgLink} target="_blank" rel="noopener noreferrer" style={{
                display: "block", textAlign: "center", background: "#229ED9", color: "#fff",
                borderRadius: 10, padding: "12px", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
              }}>
                Open Telegram Bot →
              </a>
              <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.8 }}>
                <strong>Option B — Manual:</strong><br />
                Message <code>@userinfobot</code> in Telegram to get your Chat ID, then paste it below.
              </div>
              <div>
                <label style={lbl}>Your Telegram Chat ID</label>
                <input type="text" value={tgChatId} onChange={e => setTgChatId(e.target.value)}
                  placeholder="e.g. -100123456789" style={inp} />
              </div>
              <button
                disabled={saving || !tgChatId}
                onClick={() => save({ telegram_chat_id: tgChatId })}
                style={{ width: "100%", background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save Chat ID"}
              </button>
            </>
          )}
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

      {/* Resend Email Modal */}
      <Modal open={modal === "resend"} onClose={() => setModal(null)} title="📧 Summary Emails via Resend">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.7 }}>
            After every call ends, we'll email a <strong>beautiful summary report</strong> to the address below, including:
            <ul style={{ margin: "8px 0 0 16px", padding: 0, lineHeight: 2 }}>
              <li>📋 AI-generated call summary</li>
              <li>💬 Transcript excerpt</li>
              <li>🎯 Sentiment analysis</li>
              <li>✅ Action items</li>
            </ul>
          </div>

          {resendConnected && (
            <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontWeight: 700, color: "#059669", marginBottom: 4 }}>✅ Currently sending to:</div>
              <div style={{ fontSize: "0.88rem", color: "#064E3B", fontFamily: "monospace" }}>{cfg.resend_email}</div>
            </div>
          )}

          <div>
            <label style={lbl}>Email Address *</label>
            <input type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)}
              placeholder="you@company.com" style={inp} />
            <p style={hint}>Set <code>RESEND_API_KEY</code> in your backend environment to activate sending.</p>
          </div>

          <button
            disabled={saving || !resendEmail}
            onClick={() => save({ resend_email: resendEmail })}
            style={{ width: "100%", background: "#064E3B", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Email Address"}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }`}</style>
    </div>
  );
}
