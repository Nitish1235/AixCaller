"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchIntegrations, apiPatch, apiDelete, API_BASE_URL } from "@/lib/api";

const getTenantId = () => {
  if (typeof document === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "00000000-0000-0000-0000-000000000000";
};

const TENANT_ID = getTenantId();

/* ── shared styles ─────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12, boxSizing: "border-box",
  border: "2px solid var(--text)", fontSize: "0.95rem", color: "var(--text)",
  outline: "none", fontFamily: "inherit", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 900,
  fontSize: "0.8rem", color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5,
};

/* ── Modal wrapper ─────────────────────────────────────────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ background: "#fff", padding: "2rem", width: "100%", maxWidth: 500, position: "relative", boxShadow: "12px 12px 0 var(--accent-pink)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "var(--accent-pink)", border: "2px solid var(--text)", fontSize: "1.2rem", cursor: "pointer", color: "var(--text)", width: 32, height: 32, borderRadius: "50%", fontWeight: 900, boxShadow: "2px 2px 0 var(--text)" }}>✕</button>
        <h3 style={{ fontWeight: 900, color: "var(--text)", margin: "0 0 1.5rem", fontSize: "1.4rem", textTransform: "uppercase" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ── Status badge ──────────────────────────────────────────────── */
function Badge({ connected }: { connected: boolean }) {
  return (
    <span style={{
      fontSize: "0.75rem", fontWeight: 900, padding: "4px 12px", borderRadius: 999,
      background: connected ? "var(--accent-green)" : "#cbd5e1",
      color: "var(--text)",
      border: "2px solid var(--text)",
      boxShadow: "2px 2px 0 var(--text)"
    }}>
      {connected ? "● CONNECTED" : "OFFLINE"}
    </span>
  );
}

/* ── Integration card ──────────────────────────────────────────── */
function IntCard({ icon, title, description, connected, onConnect, onDisconnect }: {
  icon: string; title: string; description: string;
  connected: boolean; onConnect: () => void; onDisconnect: () => void;
}) {
  return (
    <div className="card" style={{
      background: "#fff", padding: "2rem",
      display: "flex", flexDirection: "column", gap: "1.5rem",
      boxShadow: connected ? "8px 8px 0 var(--accent-green)" : "8px 8px 0 var(--text)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: connected ? "var(--accent-yellow)" : "#f1f5f9",
          border: "2px solid var(--text)", boxShadow: "3px 3px 0 var(--text)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
        }}>{icon}</div>
        <Badge connected={connected} />
      </div>
      <div>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)", marginBottom: 8, textTransform: "uppercase" }}>{title}</div>
        <div style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6, fontWeight: 600 }}>{description}</div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
        <button className="btn-brutal" onClick={onConnect} style={{
          flex: 1, padding: "10px", fontSize: "0.9rem",
          background: connected ? "#fff" : "var(--accent-yellow)",
        }}>
          {connected ? "⚙️ Manage" : "Connect"}
        </button>
        {connected && (
          <button onClick={onDisconnect} style={{
            padding: "10px 16px", borderRadius: 12, fontWeight: 900, fontSize: "0.9rem",
            cursor: "pointer", border: "2px solid var(--text)", background: "var(--accent-pink)", color: "var(--text)",
            boxShadow: "2px 2px 0 var(--text)"
          }}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function IntegrationsPage() {
  const [cfg, setCfg]     = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"zoho" | "email" | "shopify" | null>(null);

  // Zoho connect form
  const [zohoDC, setZohoDC] = useState("us");
  
  // Email
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [contactEmail, setContactEmail] = useState("");

  // Shopify
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchIntegrations(TENANT_ID);
      if (data) {
        setCfg(data);
        setEmailEnabled(data.email_summary_enabled ?? true);
        setContactEmail(data.contact_email || "");
        setShopifyDomain(data.shopify_domain || "");
        setShopifyToken(data.shopify_token || "");
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle return-from-OAuth params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("zoho_connected") === "1") {
      setToast("✅ Zoho CRM connected successfully!");
      load();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (p.get("zoho_error")) {
      setToast(`⚠️ Zoho connection failed: ${p.get("zoho_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    setTimeout(() => setToast(""), 4000);
  }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const save = async (patch: Record<string, any>) => {
    setSaving(true);
    try {
      await apiPatch(`/integrations?tenant_id=${TENANT_ID}`, patch);
      await load(); setModal(null); showToast("✅ Settings saved!");
    } catch { showToast("⚠️ Failed to save."); }
    setSaving(false);
  };

  const disconnect = async (key: string) => {
    setSaving(true);
    try {
      if (key === "zoho") {
        await fetch(`${API_BASE_URL}/zoho/disconnect?tenant_id=${TENANT_ID}`, { method: "DELETE" });
      } else if (key === "shopify") {
        await apiPatch(`/integrations?tenant_id=${TENANT_ID}`, { shopify_domain: null, shopify_token: null });
      } else {
        await apiDelete(`/integrations/${key}?tenant_id=${TENANT_ID}`);
      }
      await load(); showToast(`🔌 ${key} disconnected.`);
    } catch {}
    setSaving(false);
  };

  const connectZoho = () => {
    window.location.href = `${API_BASE_URL}/zoho/install?tenant_id=${TENANT_ID}&dc=${zohoDC}`;
  };

  const testZoho = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/zoho/test-connection?tenant_id=${TENANT_ID}`, { method: "POST" });
      const data = await res.json();
      showToast(data.ok ? `✅ ${data.message}` : `⚠️ ${data.message}`);
    } catch { showToast("⚠️ Test failed."); }
    setSaving(false);
  };

  const zohoConnected  = !!(cfg.zoho_connected);
  const emailConnected = !!(cfg.email_summary_enabled);
  const shopifyConnected = !!(cfg.shopify_domain && cfg.shopify_token);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 1200 }}>

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 2000,
          background: "var(--accent-yellow)", color: "var(--text)", borderRadius: 12, border: "2px solid var(--text)",
          padding: "16px 24px", fontWeight: 900, fontSize: "1rem", textTransform: "uppercase",
          boxShadow: "6px 6px 0 var(--text)", maxWidth: 400,
        }}>{toast}</div>
      )}

      <div>
        <h1 style={{ fontWeight: 900, fontSize: "2rem", color: "var(--text)", margin: 0, textTransform: "uppercase", letterSpacing: -1 }}>
          Integrations Hub
        </h1>
        <p style={{ color: "#475569", margin: "8px 0 0", fontSize: "1.1rem", fontWeight: 600 }}>
          Connect your AI workforce to your existing business tools.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2rem" }}>

        <IntCard
          icon="🛍️" title="Shopify" connected={shopifyConnected}
          description="Allow your AI agent to check order statuses, process refunds, and answer specific product queries securely."
          onConnect={() => setModal("shopify")}
          onDisconnect={() => disconnect("shopify")}
        />

        <IntCard
          icon="💼" title="Zoho CRM" connected={zohoConnected}
          description="One-click OAuth — calls automatically create or update leads in your Zoho CRM with summary, sentiment and transcript."
          onConnect={() => setModal("zoho")}
          onDisconnect={() => disconnect("zoho")}
        />

        <IntCard
          icon="📧" title="Email Summaries" connected={emailConnected}
          description="Receive a beautiful call summary by email after every conversation, sent to your account address."
          onConnect={() => setModal("email")}
          onDisconnect={() => save({ email_summary_enabled: false })}
        />
      </div>

      {/* Shopify Modal */}
      <Modal open={modal === "shopify"} onClose={() => setModal(null)} title="🛍️ Connect Shopify">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "var(--bg)", border: "2px solid var(--text)", borderRadius: 12, padding: "16px", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6, fontWeight: 600 }}>
            <strong>Instructions:</strong> Go to Shopify Admin → Apps → Develop Apps. Create an app, assign 'read_orders' and 'write_orders' scopes, and install it to get your Admin API Access Token.
          </div>

          <div>
            <label style={lbl}>Shopify Store Domain</label>
            <input type="text" placeholder="your-store.myshopify.com" style={inp} value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} />
          </div>

          <div>
            <label style={lbl}>Admin API Access Token</label>
            <input type="password" placeholder="shpat_..." style={inp} value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} />
          </div>

          <button
            disabled={saving || !shopifyDomain || !shopifyToken}
            onClick={() => save({ shopify_domain: shopifyDomain, shopify_token: shopifyToken })}
            className="btn-brutal" style={{ width: "100%", padding: "14px", marginTop: "1rem" }}>
            {saving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      </Modal>

      {/* Zoho Modal (OAuth) */}
      <Modal open={modal === "zoho"} onClose={() => setModal(null)} title="💼 Connect Zoho CRM">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {zohoConnected ? (
            <>
              <div style={{ background: "var(--accent-green)", border: "2px solid var(--text)", borderRadius: 12, padding: "16px", boxShadow: "4px 4px 0 var(--text)" }}>
                <div style={{ fontWeight: 900, color: "var(--text)", marginBottom: 8, fontSize: "1rem", textTransform: "uppercase" }}>
                  ✓ Zoho CRM is connected
                </div>
                {cfg.zoho_domain && (
                  <div className="mono" style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                    API domain: {cfg.zoho_domain}
                  </div>
                )}
              </div>
              <button onClick={testZoho} disabled={saving} className="btn-brutal" style={{ width: "100%", background: "#fff", marginTop: "1rem" }}>
                🔍 Test Connection
              </button>
              <button
                onClick={() => { disconnect("zoho"); setModal(null); }}
                disabled={saving}
                style={{ width: "100%", background: "var(--accent-pink)", color: "var(--text)", border: "2px solid var(--text)", borderRadius: 12, padding: "12px", fontWeight: 900, cursor: "pointer", boxShadow: "2px 2px 0 var(--text)", textTransform: "uppercase" }}
              >
                Disconnect Zoho
              </button>
            </>
          ) : (
            <>
              <div style={{ background: "var(--bg)", border: "2px solid var(--text)", borderRadius: 12, padding: "16px", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6, fontWeight: 600 }}>
                <strong>How it works:</strong> Click "Connect with Zoho" → you'll be redirected to Zoho's
                authorization screen → approve access → you're back here, connected. No tokens to copy.
              </div>

              <div>
                <label style={lbl}>Your Zoho Data Center</label>
                <select value={zohoDC} onChange={e => setZohoDC(e.target.value)} style={inp}>
                  <option value="us">United States (zoho.com)</option>
                  <option value="eu">Europe (zoho.eu)</option>
                  <option value="in">India (zoho.in)</option>
                  <option value="au">Australia (zoho.com.au)</option>
                  <option value="jp">Japan (zoho.jp)</option>
                  <option value="cn">China (zoho.com.cn)</option>
                </select>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "8px 0 0", fontWeight: 600 }}>
                  Pick the region where your Zoho account lives (visible in your admin URL).
                </p>
              </div>

              <button
                onClick={connectZoho}
                disabled={saving}
                className="btn-brutal" style={{ width: "100%", marginTop: "1rem", background: "var(--accent-pink)" }}
              >
                💼 Connect with Zoho
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal open={modal === "email"} onClose={() => setModal(null)} title="📧 Email Summary">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "var(--bg)", border: "2px solid var(--text)", borderRadius: 12, padding: "16px", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6, fontWeight: 600 }}>
            We send a beautiful AI-generated call report to your account email after every conversation.
          </div>

          <div style={{ background: "var(--accent-yellow)", border: "2px solid var(--text)", borderRadius: 12, padding: "16px", boxShadow: "4px 4px 0 var(--text)" }}>
            <div style={{ fontWeight: 900, color: "var(--text)", marginBottom: 6, textTransform: "uppercase", fontSize: "0.85rem" }}>Destination Email:</div>
            <div className="mono" style={{ fontSize: "1rem", color: "var(--text)", fontWeight: 700 }}>{contactEmail}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0" }}>
            <span style={{ fontWeight: 900, color: "var(--text)", fontSize: "1rem", textTransform: "uppercase" }}>Enable Email Summaries</span>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={e => setEmailEnabled(e.target.checked)}
              style={{ width: 24, height: 24, accentColor: "var(--text)", cursor: "pointer" }}
            />
          </div>

          <button
            disabled={saving}
            onClick={() => save({ email_summary_enabled: emailEnabled })}
            className="btn-brutal" style={{ width: "100%" }}>
            {saving ? "Updating..." : "Save Preferences"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
