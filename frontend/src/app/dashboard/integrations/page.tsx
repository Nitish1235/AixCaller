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
  width: "100%", padding: "10px 14px", borderRadius: 9, boxSizing: "border-box",
  border: "1.5px solid #D1FAE5", fontSize: "0.9rem", color: "#064E3B",
  outline: "none", fontFamily: "inherit", background: "#fff",
};
const lbl: React.CSSProperties = {
  display: "block", marginBottom: 6, fontWeight: 700,
  fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5,
};

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
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: connected ? "linear-gradient(135deg,#064E3B,#10B981)" : "#F3F4F6",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
        }}>{icon}</div>
        <Badge connected={connected} />
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: "0.83rem", color: "#6B7280", lineHeight: 1.6 }}>{description}</div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
        <button onClick={onConnect} style={{
          flex: 1, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem",
          cursor: "pointer", border: "none",
          background: connected ? "#F6FEFA" : "#064E3B",
          color: connected ? "#059669" : "#fff",
          boxShadow: connected ? "none" : "0 4px 12px rgba(6,78,59,0.25)",
        }}>
          {connected ? "⚙️ Manage" : "Connect"}
        </button>
        {connected && (
          <button onClick={onDisconnect} style={{
            padding: "10px 14px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem",
            cursor: "pointer", border: "1.5px solid #FECACA", background: "#FFF5F5", color: "#DC2626",
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
  const [modal, setModal] = useState<"zoho" | "email" | null>(null);

  // Zoho connect form
  const [zohoDC, setZohoDC] = useState("us");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [contactEmail, setContactEmail] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchIntegrations(TENANT_ID);
      if (data) {
        setCfg(data);
        setEmailEnabled(data.email_summary_enabled ?? true);
        setContactEmail(data.contact_email || "");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 2000,
          background: "#064E3B", color: "#fff", borderRadius: 12,
          padding: "12px 20px", fontWeight: 700, fontSize: "0.9rem",
          boxShadow: "0 8px 30px rgba(6,78,59,0.35)", maxWidth: 400,
        }}>{toast}</div>
      )}

      <div>
        <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>
          Integrations Hub
        </h1>
        <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>
          Connect your AI workforce to your existing business tools.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>

        {/* Shopify lives on each Agent's settings page (per-agent), so we don't list it here. */}

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

      {/* Zoho Modal (OAuth) */}
      <Modal open={modal === "zoho"} onClose={() => setModal(null)} title="💼 Connect Zoho CRM">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {zohoConnected ? (
            <>
              <div style={{ background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontWeight: 700, color: "#059669", marginBottom: 6, fontSize: "0.85rem" }}>
                  ✓ Zoho CRM is connected
                </div>
                {cfg.zoho_domain && (
                  <div style={{ fontSize: "0.8rem", color: "#064E3B", fontFamily: "monospace" }}>
                    API domain: {cfg.zoho_domain}
                  </div>
                )}
              </div>
              <button onClick={testZoho} disabled={saving} style={{ width: "100%", background: "#F6FEFA", color: "#059669", border: "1.5px solid #D1FAE5", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer" }}>
                🔍 Test Connection
              </button>
              <button
                onClick={() => { disconnect("zoho"); setModal(null); }}
                disabled={saving}
                style={{ width: "100%", background: "#FFF5F5", color: "#DC2626", border: "1.5px solid #FECACA", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Disconnect Zoho
              </button>
            </>
          ) : (
            <>
              <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.6 }}>
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
                <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "5px 0 0" }}>
                  Pick the region where your Zoho account lives (visible in your Zoho admin URL).
                </p>
              </div>

              <button
                onClick={connectZoho}
                disabled={saving}
                style={{ width: "100%", background: "#E42527", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                💼 Connect with Zoho
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal open={modal === "email"} onClose={() => setModal(null)} title="📧 Email Summary Settings">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#F6FEFA", border: "1px solid #D1FAE5", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", color: "#064E3B", lineHeight: 1.7 }}>
            We send a beautiful AI-generated call report to your account email after every conversation.
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
    </div>
  );
}
