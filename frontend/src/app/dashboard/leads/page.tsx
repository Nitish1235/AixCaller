"use client";
import { useState, useEffect, useRef } from "react";
import { apiGet, apiPatch, fetchCalls, getTenantId, fetchCampaigns, uploadCampaignLeads } from "@/lib/api";

/* ── shared micro-styles ─────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: "#fff", border: "1.5px solid var(--border)",
  borderRadius: 14, padding: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const badge = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 5,
  background: bg, color, border: `1px solid ${border}`,
  borderRadius: 99, padding: "3px 10px",
  fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" as const,
});

const SENTIMENT_STYLE: Record<string, React.CSSProperties> = {
  Happy:      badge("#dcfce7", "#166534", "#bbf7d0"),
  positive:   badge("#dcfce7", "#166534", "#bbf7d0"),
  Neutral:    badge("#f1f5f9", "#475569", "#e2e8f0"),
  neutral:    badge("#f1f5f9", "#475569", "#e2e8f0"),
  Frustrated: badge("#fee2e2", "#991b1b", "#fca5a5"),
  negative:   badge("#fee2e2", "#991b1b", "#fca5a5"),
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}m ${s}s`;
}

/* ── CSV parser ──────────────────────────────────────────────────── */
function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const phoneIdx = headers.findIndex(h => ["phone","phone_number","mobile","number","telephone"].includes(h));
  const nameIdx  = headers.findIndex(h => ["name","full_name","full name","first name"].includes(h));
  const emailIdx = headers.findIndex(h => ["email","email_address","e-mail"].includes(h));
  if (phoneIdx === -1) return [];
  return lines.slice(1).flatMap(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const phone = cols[phoneIdx];
    if (!phone) return [];
    return [{ phone, name: nameIdx >= 0 ? cols[nameIdx] || "Valued Customer" : "Valued Customer", email: emailIdx >= 0 ? cols[emailIdx] : undefined }];
  });
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function ActivityPage() {
  const [tab, setTab] = useState<"calls" | "leads" | "import">("calls");

  /* calls state */
  const [calls, setCalls]       = useState<any[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [callFilter, setCallFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [callSearch, setCallSearch] = useState("");
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  /* leads state */
  const [leads, setLeads]       = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  /* import state */
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [csvLeads, setCsvLeads] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tid = getTenantId();

  useEffect(() => {
    fetchCalls(tid).then(d => { setCalls(Array.isArray(d) ? d : []); setCallsLoading(false); });
    apiGet(`/leads?tenant_id=${tid}`).then(d => { setLeads(d?.leads || []); setLeadsLoading(false); }).catch(() => setLeadsLoading(false));
    fetchCampaigns(tid).then(d => setCampaigns(d || [])).catch(() => {});
  }, []);

  /* filtered calls */
  const filteredCalls = calls.filter(c => {
    if (callFilter !== "all" && c.direction !== callFilter) return false;
    if (callSearch && !c.from_number?.includes(callSearch) && !c.summary?.toLowerCase().includes(callSearch.toLowerCase())) return false;
    return true;
  });

  /* lead status update */
  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await apiPatch(`/leads/${id}`, { status });
      setLeads(p => p.map(l => l.id === id ? { ...l, status } : l));
    } catch {}
  };

  /* CSV import */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target?.result as string);
      setCsvLeads(parsed);
      setCsvFileName(f.name);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!selectedCampaign || csvLeads.length === 0) return;
    setUploading(true); setUploadMsg(null);
    try {
      await uploadCampaignLeads(selectedCampaign, tid, csvLeads);
      setUploadMsg({ ok: true, text: `✓ ${csvLeads.length} leads added to campaign.` });
      setCsvLeads([]); setCsvFileName("");
    } catch (e: any) {
      setUploadMsg({ ok: false, text: e.message || "Upload failed." });
    }
    setUploading(false);
  };

  /* ── tab pill helper ── */
  const TAB_BTN = (id: typeof tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "8px 18px", borderRadius: 9, border: "none",
        background: tab === id ? "var(--blue)" : "#f1f5f9",
        color: tab === id ? "#fff" : "#475569",
        fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 7,
        transition: "all 0.15s",
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          background: tab === id ? "rgba(255,255,255,0.25)" : "#e2e8f0",
          color: tab === id ? "#fff" : "#64748b",
          borderRadius: 99, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 800,
        }}>{count}</span>
      )}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.5rem", color: "var(--text)", margin: 0, letterSpacing: "-0.4px" }}>
            Activity
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "3px 0 0", fontSize: "0.85rem" }}>
            All calls, captured leads, and lead imports in one place.
          </p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8 }}>
          {TAB_BTN("calls",  "Call History",  callsLoading  ? undefined : calls.length)}
          {TAB_BTN("leads",  "CRM Leads",     leadsLoading  ? undefined : leads.length)}
          {TAB_BTN("import", "Import Leads")}
        </div>
      </div>

      {/* ══════════════════════════════ CALLS TAB ══════════════════════════════ */}
      {tab === "calls" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Filter bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Search by number or summary…"
              value={callSearch}
              onChange={e => setCallSearch(e.target.value)}
              style={{ flex: "1 1 220px", padding: "8px 14px", borderRadius: 9, border: "1.5px solid var(--border)", fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }}
            />
            {(["all","inbound","outbound"] as const).map(f => (
              <button key={f} onClick={() => setCallFilter(f)} style={{
                padding: "7px 14px", borderRadius: 8, border: "1.5px solid",
                borderColor: callFilter === f ? "var(--blue)" : "var(--border)",
                background: callFilter === f ? "var(--blue-light)" : "#fff",
                color: callFilter === f ? "var(--blue)" : "var(--text-muted)",
                fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", textTransform: "capitalize" as const,
              }}>{f}</button>
            ))}
          </div>

          {/* Calls list */}
          {callsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: "#f1f5f9", animation: "pulse 1.5s ease infinite" }} />)}
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "4rem 2rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 6 }}>No calls yet</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {callSearch || callFilter !== "all" ? "No calls match your filters." : "Call history will appear here once your agents start talking."}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredCalls.map((call: any) => {
                const isOpen = expandedCall === call.id;
                const caller = (!call.from_number || call.from_number.toLowerCase() === "unknown") ? "Unknown caller" : call.from_number;
                const dt = new Date(call.created_at);
                return (
                  <div key={call.id} style={{ ...card, padding: "0", overflow: "hidden", cursor: "pointer" }}
                    onClick={() => setExpandedCall(isOpen ? null : call.id)}>
                    {/* Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                      {/* Direction icon */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: call.direction === "outbound" ? "#eff6ff" : "#f0fdf4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke={call.direction === "outbound" ? "var(--blue)" : "var(--green)"}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {call.direction === "outbound"
                            ? <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/><path d="M15 3h6m0 0v6m0-6-7 7"/></>
                            : <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                          }
                        </svg>
                      </div>

                      {/* Caller + date */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", fontFamily: "monospace" }}>{caller}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" · "}<span style={{ textTransform: "capitalize" }}>{call.direction}</span>
                        </div>
                      </div>

                      {/* Summary excerpt */}
                      <div style={{ flex: 2, minWidth: 0, display: "flex", alignItems: "center" }}>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "100%" }}>
                          {call.summary || "—"}
                        </p>
                      </div>

                      {/* Badges */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        {call.sentiment && SENTIMENT_STYLE[call.sentiment] && (
                          <span style={SENTIMENT_STYLE[call.sentiment]}>{call.sentiment}</span>
                        )}
                        {call.duration_seconds > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--blue)", fontWeight: 700 }}>
                            {fmt(call.duration_seconds)}
                          </span>
                        )}
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 10 }}>
                        {call.summary && (
                          <div>
                            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>Summary</div>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.6 }}>{call.summary}</p>
                          </div>
                        )}
                        {call.action_items && call.action_items !== "[]" && (
                          <div>
                            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>Action Items</div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                              {(JSON.parse(call.action_items) as string[]).map((a, i) => (
                                <span key={i} style={{ background: "var(--blue-light)", color: "var(--blue)", border: "1px solid rgba(29,78,216,0.15)", borderRadius: 8, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600 }}>{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 16, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          <span>To: <strong style={{ color: "var(--text)", fontFamily: "monospace" }}>{call.to_number}</strong></span>
                          <span>Type: <strong style={{ color: "var(--text)", textTransform: "capitalize" as const }}>{call.call_type || "general"}</strong></span>
                          {call.sms_sent && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ SMS sent</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════ LEADS TAB ══════════════════════════════ */}
      {tab === "leads" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "8px 12px", background: "#f8fafc", borderRadius: 9, border: "1px solid var(--border)" }}>
            💡 These are CRM leads automatically extracted from your inbound calls by the AI. To manage leads for outbound campaigns, go to the <strong>Import Leads</strong> tab.
          </div>

          {leadsLoading ? (
            <div style={{ height: 200, borderRadius: 14, background: "#f1f5f9", animation: "pulse 1.5s ease infinite" }} />
          ) : leads.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "4rem 2rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 6 }}>No leads captured yet</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 360, margin: "0 auto" }}>
                When your AI agents talk to callers and capture contact info, those leads appear here automatically.
              </div>
            </div>
          ) : (
            <div style={{ ...card, padding: 0, overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const, minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--border)", background: "#f8fafc" }}>
                    {["Date", "Name", "Contact", "Intent", "Appointment", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left" as const, padding: "11px 14px", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" as const, color: "var(--text-muted)", letterSpacing: 0.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l: any) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "13px 14px", fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" as const }}>{new Date(l.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>{l.name || "Unknown"}</div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text)", fontWeight: 600 }}>{l.phone}</div>
                        {l.email && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{l.email}</div>}
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ fontSize: "0.82rem", color: "var(--text)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{l.intent || "—"}</div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        {l.appointment_date ? (
                          <span style={{ background: "var(--blue-light)", color: "var(--blue)", border: "1px solid rgba(29,78,216,0.15)", borderRadius: 8, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700 }}>
                            {l.appointment_date} · {l.appointment_time}
                          </span>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <select value={l.status} onChange={e => updateLeadStatus(l.id, e.target.value)}
                          style={{
                            padding: "5px 10px", borderRadius: 8, border: "1.5px solid var(--border)",
                            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", outline: "none",
                            background: l.status === "booked" ? "var(--green-light)" : l.status === "contacted" ? "var(--blue-light)" : "#f8fafc",
                            color: l.status === "booked" ? "var(--green)" : l.status === "contacted" ? "var(--blue)" : "var(--text)",
                          }}>
                          {["new","contacted","booked","closed"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════ IMPORT TAB ══════════════════════════════ */}
      {tab === "import" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>

          {/* ── CSV Upload ── */}
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", marginBottom: 4 }}>📥 Upload CSV to Campaign</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Upload a CSV file of phone numbers to any active or inactive campaign. The dialer will start calling them when the campaign is activated.
              </p>
            </div>

            {/* Campaign picker */}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.4, marginBottom: 6 }}>Select Campaign</label>
              <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", background: "#fff" }}>
                <option value="">— Choose a campaign —</option>
                {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
              </select>
              {campaigns.length === 0 && (
                <p style={{ margin: "5px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  No campaigns yet. <a href="/dashboard/campaigns" style={{ color: "var(--blue)", fontWeight: 600 }}>Create one →</a>
                </p>
              )}
            </div>

            {/* File drop */}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.4, marginBottom: 6 }}>CSV File</label>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "none" }} />
              <div onClick={() => fileRef.current?.click()} style={{
                border: "2px dashed var(--border)", borderRadius: 10, padding: "2rem", textAlign: "center" as const,
                cursor: "pointer", background: csvLeads.length > 0 ? "var(--green-light)" : "#fafafa", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = csvLeads.length > 0 ? "var(--green-light)" : "var(--blue-light)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = csvLeads.length > 0 ? "var(--green-light)" : "#fafafa"; }}
              >
                {csvLeads.length > 0 ? (
                  <>
                    <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>✅</div>
                    <div style={{ fontWeight: 700, color: "var(--green)", fontSize: "0.92rem" }}>{csvLeads.length} leads loaded</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>from "{csvFileName}" — click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📂</div>
                    <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.88rem" }}>Click to upload CSV</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>Required column: <strong>phone</strong> · Optional: name, email</div>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            {csvLeads.length > 0 && (
              <div style={{ border: "1.5px solid var(--border)", borderRadius: 9, overflow: "hidden" as const }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr", padding: "7px 12px", background: "#f8fafc", borderBottom: "1px solid var(--border)", fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.4 }}>
                  <span>Name</span><span>Phone</span><span>Email</span>
                </div>
                {csvLeads.slice(0, 5).map((l, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr", padding: "7px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "0.78rem", color: "var(--text)" }}>
                    <span style={{ fontWeight: 600 }}>{l.name}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>{l.phone}</span>
                    <span style={{ color: "var(--text-muted)" }}>{l.email || "—"}</span>
                  </div>
                ))}
                {csvLeads.length > 5 && <div style={{ padding: "7px 12px", fontSize: "0.72rem", color: "var(--text-muted)", background: "#f8fafc" }}>+{csvLeads.length - 5} more rows</div>}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedCampaign || csvLeads.length === 0}
              style={{
                background: selectedCampaign && csvLeads.length > 0 ? "var(--blue)" : "#e2e8f0",
                color: selectedCampaign && csvLeads.length > 0 ? "#fff" : "#94a3b8",
                border: "none", borderRadius: 9, padding: "10px", fontWeight: 700, fontSize: "0.88rem",
                cursor: selectedCampaign && csvLeads.length > 0 ? "pointer" : "not-allowed",
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {uploading
                ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Uploading…</>
                : `Upload ${csvLeads.length > 0 ? csvLeads.length + " leads" : "Leads"} →`}
            </button>

            {uploadMsg && (
              <div style={{ padding: "9px 12px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                background: uploadMsg.ok ? "var(--green-light)" : "var(--red-light)",
                color: uploadMsg.ok ? "var(--green)" : "var(--red)",
                border: `1px solid ${uploadMsg.ok ? "#bbf7d0" : "#fca5a5"}` }}>
                {uploadMsg.text}
              </div>
            )}

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>

          {/* ── Google Sheets guide ── */}
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", marginBottom: 4 }}>
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlesheets.svg" alt="" width={18} style={{ verticalAlign: "middle", marginRight: 6, filter: "invert(40%) sepia(80%) saturate(500%) hue-rotate(100deg)" }} />
                Connect Google Sheets
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Link a Google Sheet to your campaign agent. The dialer automatically imports new rows when the campaign starts, and writes results back (Answered, Booked, Voicemail) in real time.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { num: "1", title: "Open Agent Settings", desc: 'Go to Agents → your agent → Configure Agent → scroll to Tools Config section.' },
                { num: "2", title: "Add your Sheet ID", desc: 'In "google_sheets", paste the Sheet ID from your Google Sheets URL (the long string between /d/ and /edit).' },
                { num: "3", title: "Connect Google", desc: 'Go to Integrations and connect your Google account if not already connected.' },
                { num: "4", title: "Sheet auto-syncs on campaign start", desc: 'When you activate a campaign, the system reads all rows with blank or "pending" status and starts dialing. Results are written back automatically.' },
              ].map(s => (
                <div key={s.num} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.78rem", flexShrink: 0 }}>{s.num}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)", marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--blue-light)", border: "1px solid rgba(29,78,216,0.15)", borderRadius: 9, padding: "10px 14px", fontSize: "0.78rem", color: "var(--blue)", lineHeight: 1.6 }}>
              <strong>Required Sheet columns:</strong> <code>phone</code> (required) · <code>name</code> · <code>email</code> · any extra columns become lead variables the AI can reference during the call.
            </div>

            <a href="/dashboard/agents" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", background: "none", border: "1.5px solid var(--border)", borderRadius: 9, padding: "9px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: "var(--blue)" }}>
                Open Agent Settings →
              </button>
            </a>
          </div>

        </div>
      )}
    </div>
  );
}
