"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getTenantId, fetchAgents, fetchCampaigns,
  createCampaignAPI, updateCampaign,
  uploadCampaignLeads, fetchCampaignStats,
  deleteCampaign, API_BASE_URL,
} from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */
interface AgentData {
  id: string;
  name: string;
  phone_number: string | null;
  business_name: string | null;
  voice_id: string;
  telnyx_assistant_id: string | null;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  agent_id: string;
  agent_name: string;
  agent_phone: string | null;
  leads_count: number;
  created_at: string | null;
  speed_to_lead_enabled: boolean;
  sms_enabled: boolean;
  calling_window_start: string;
  calling_window_end: string;
}

interface CampaignStats {
  total_leads: number;
  by_status: Record<string, number>;
}

interface ParsedLead {
  name: string;
  phone: string;
  email?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   WIZARD STEP DEFINITIONS
═══════════════════════════════════════════════════════════════════ */
const WIZARD_STEPS = [
  { id: "name",     label: "Campaign Name",   icon: "📌" },
  { id: "agent",    label: "Choose Agent",    icon: "🤖" },
  { id: "leads",    label: "Lead List",       icon: "📋" },
  { id: "schedule", label: "Call Schedule",   icon: "🕐" },
  { id: "launch",   label: "Review & Launch", icon: "🚀" },
];

const STRATEGIES = [
  { id: "immediate",    label: "Immediate Dial",     desc: "Call leads as soon as they're added", icon: "⚡" },
  { id: "scheduled",    label: "Scheduled Windows",  desc: "Set specific calling hours & days",   icon: "📅" },
  { id: "drip",         label: "Multi-Touch Drip",   desc: "Call + SMS follow-up cadence",        icon: "🌊" },
  { id: "reactivation", label: "Lead Reactivation",  desc: "Re-engage cold or stale leads",       icon: "🔥" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  inactive:  { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
  active:    { bg: "#ecfdf5", text: "#059669", dot: "#059669" },
  completed: { bg: "#f5f3ff", text: "#7c3aed", dot: "#7c3aed" },
  paused:    { bg: "#fefce8", text: "#ca8a04", dot: "#ca8a04" },
};

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1.5px solid #e2e8f0", fontSize: "0.85rem",
  outline: "none", fontFamily: "inherit", color: "#0f172a",
  boxSizing: "border-box", background: "#fff", transition: "border-color 0.2s",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.7rem", fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5,
};

/* ═══════════════════════════════════════════════════════════════════
   CSV PARSER UTIL
═══════════════════════════════════════════════════════════════════ */
function parseCSV(text: string): ParsedLead[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",").map(h => h.trim());
  const nameIdx = header.findIndex(h => h === "name" || h === "full_name" || h === "full name");
  const phoneIdx = header.findIndex(h => h === "phone" || h === "phone_number" || h === "phone number" || h === "mobile");
  const emailIdx = header.findIndex(h => h === "email" || h === "email_address");
  if (phoneIdx === -1) return [];
  const leads: ParsedLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const phone = cols[phoneIdx];
    if (!phone) continue;
    leads.push({
      name: nameIdx >= 0 ? (cols[nameIdx] || "Valued Customer") : "Valued Customer",
      phone,
      email: emailIdx >= 0 ? cols[emailIdx] : undefined,
    });
  }
  return leads;
}

/* ═══════════════════════════════════════════════════════════════════
   PIPELINE ARROW
═══════════════════════════════════════════════════════════════════ */
function PipeArrow({ color = "#2563eb" }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: 52, flexShrink: 0 }}>
      <svg width="52" height="16" style={{ overflow: "visible" }}>
        <line x1="0" y1="8" x2="44" y2="8" stroke={color} strokeWidth="2.5" strokeDasharray="5 3" />
        <polygon points="52,8 40,4 40,12" fill={color} />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PIPELINE NODE
═══════════════════════════════════════════════════════════════════ */
function PipeNode({ icon, title, sub, color, bgColor, selected, onClick, actionLabel, onAction }: {
  icon: string; title: string; sub: string; color: string; bgColor: string;
  selected: boolean; onClick: () => void; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ background: selected ? bgColor : "#fff", border: selected ? `2px solid ${color}` : "1.5px solid #e2e8f0", borderRadius: 14, padding: "1rem 1.1rem", minWidth: 190, maxWidth: 220, cursor: "pointer", boxShadow: selected ? `0 6px 24px ${color}20` : "0 2px 10px rgba(0,0,0,0.03)", transition: "all 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bgColor, border: `1.5px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>{icon}</div>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669", boxShadow: "0 0 0 3px #ecfdf5", marginTop: 5 }} />
      </div>
      <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "#0f172a", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: "0.67rem", color: "#94a3b8", fontFamily: "monospace", marginBottom: 10 }}>{sub}</div>
      {actionLabel && (
        <button onClick={e => { e.stopPropagation(); onAction?.(); }} style={{ fontSize: "0.67rem", fontWeight: 700, padding: "3px 9px", borderRadius: 6, border: "1.5px solid #e2e8f0", color: "#64748b", background: "#fff", cursor: "pointer" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BUILDER WIZARD MODAL
═══════════════════════════════════════════════════════════════════ */
interface BuilderState {
  name: string;
  agentId: string;
  parsedLeads: ParsedLead[];
  leadsFileName: string;
  strategy: string;
  callingWindowTimezone: string;
  callingWindowStart: string;
  callingWindowEnd: string;
  speedToLead: boolean;
  smsEnabled: boolean;
}

/* Avatar initial badge for an agent */
function AgentAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ["#2563eb","#059669","#7c3aed","#dc2626","#d97706","#0891b2"];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.4, flexShrink: 0, letterSpacing: -0.5 }}>
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function BuilderModal({ onClose, onComplete, existingAgents, tenantId }: {
  onClose: () => void;
  onComplete: () => void;
  existingAgents: AgentData[];
  tenantId: string;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BuilderState>({
    name: "", agentId: "",
    parsedLeads: [], leadsFileName: "",
    strategy: "immediate",
    callingWindowTimezone: "lead_local",
    callingWindowStart: "09:00", callingWindowEnd: "20:00",
    speedToLead: false, smsEnabled: false,
  });

  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchProgress, setLaunchProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepId = WIZARD_STEPS[step].id;
  const upd = (patch: Partial<BuilderState>) => setData(d => ({ ...d, ...patch }));

  const selectedAgent = existingAgents.find(a => a.id === data.agentId);

  const canContinue = () => {
    if (stepId === "name")  return data.name.trim().length > 0;
    if (stepId === "agent") return data.agentId.length > 0;
    return true;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const leads = parseCSV(ev.target?.result as string);
      upd({ parsedLeads: leads, leadsFileName: file.name });
    };
    reader.readAsText(file);
  };

  const handleLaunch = async () => {
    setLaunching(true); setLaunchError("");
    try {
      setLaunchProgress("Creating campaign…");
      const campaign = await createCampaignAPI({
        tenant_id: tenantId,
        agent_id: data.agentId,
        name: data.name,
        calling_window_timezone: data.callingWindowTimezone,
        calling_window_start: data.callingWindowStart,
        calling_window_end: data.callingWindowEnd,
        speed_to_lead_enabled: data.speedToLead,
        sms_enabled: data.smsEnabled,
      });
      if (data.parsedLeads.length > 0) {
        setLaunchProgress(`Uploading ${data.parsedLeads.length} leads…`);
        await uploadCampaignLeads(campaign.id, tenantId, data.parsedLeads);
      }
      setLaunchProgress("✅ Campaign created!");
      setTimeout(() => onComplete(), 1000);
    } catch (err: any) {
      setLaunchError(err.message || "Something went wrong.");
      setLaunching(false);
    }
  };

  const next = () => {
    if (step < WIZARD_STEPS.length - 1) setStep(s => s + 1);
    else handleLaunch();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20,
        width: "100%", maxWidth: 780,
        display: "flex", flexDirection: "column",
        maxHeight: "90vh", overflow: "hidden",
        boxShadow: "0 32px 100px rgba(0,0,0,0.28)",
      }}>

        {/* ── HEADER ── */}
        <div style={{ padding: "1.4rem 1.75rem 1rem", borderBottom: "1.5px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#0f172a", letterSpacing: -0.5 }}>New Outbound Campaign</div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {WIZARD_STEPS.map((s, i) => {
                const done = i < step; const active = i === step;
                return (
                  <div key={s.id} onClick={() => i <= step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: i <= step ? "pointer" : "default", opacity: i > step ? 0.38 : 1 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.6rem", fontWeight: 800,
                      background: done ? "#059669" : active ? "#2563eb" : "#e2e8f0",
                      color: done || active ? "#fff" : "#94a3b8",
                      transition: "all 0.2s",
                    }}>{done ? "✓" : i + 1}</div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: active ? "#2563eb" : done ? "#059669" : "#94a3b8", whiteSpace: "nowrap" }}>{s.label}</span>
                    {i < WIZARD_STEPS.length - 1 && <div style={{ width: 20, height: 2, background: done ? "#059669" : "#e2e8f0", borderRadius: 99, marginLeft: 2 }} />}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1, padding: "4px 6px", borderRadius: 6, marginTop: -4 }}>×</button>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem" }}>

          {/* ── STEP 1: Campaign Name ── */}
          {stepId === "name" && (
            <div style={{ animation: "fadeSlideIn 0.25s ease", maxWidth: 500 }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>Name your campaign</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>Give this outbound campaign a clear, descriptive name so you can identify it later.</div>
              </div>
              <input
                autoFocus type="text" style={{ ...inp, fontSize: "1rem", padding: "12px 16px", borderRadius: 10 }}
                value={data.name} placeholder="e.g. Q3 Re-engagement, Black Friday Outreach…"
                onChange={e => upd({ name: e.target.value })}
                onKeyDown={e => e.key === "Enter" && canContinue() && next()}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
              <div style={{ marginTop: "1.5rem", background: "#f8fafc", borderRadius: 12, padding: "1rem 1.25rem", fontSize: "0.82rem", color: "#64748b", lineHeight: 1.7 }}>
                <strong style={{ color: "#0f172a" }}>Tips for good campaign names:</strong>
                <ul style={{ margin: "6px 0 0 1rem", padding: 0 }}>
                  <li>Include the audience — <em>"Lapsed Customers Jun 2025"</em></li>
                  <li>Include the goal — <em>"Book Demo Outreach"</em></li>
                  <li>Include the date or version — <em>"Q3 Follow-up v2"</em></li>
                </ul>
              </div>
            </div>
          )}

          {/* ── STEP 2: Agent Picker ── */}
          {stepId === "agent" && (
            <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>Choose your AI caller</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
                  Select the agent that will make calls for this campaign. Its voice, prompt, and phone number are already configured.
                </div>
              </div>

              {existingAgents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 2rem", border: "2px dashed #e2e8f0", borderRadius: 16, color: "#64748b" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🤖</div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>No agents yet</div>
                  <div style={{ fontSize: "0.85rem", lineHeight: 1.6, marginBottom: 20 }}>Create an agent first — then come back to set up your campaign.</div>
                  <a href="/dashboard/agents/create" style={{ display: "inline-block", padding: "10px 22px", background: "#2563eb", color: "#fff", borderRadius: 9, fontWeight: 700, fontSize: "0.88rem", textDecoration: "none" }}>
                    Create an Agent →
                  </a>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {existingAgents.map(agent => {
                    const sel = data.agentId === agent.id;
                    const hasPhone = !!agent.phone_number;
                    return (
                      <div
                        key={agent.id}
                        onClick={() => upd({ agentId: agent.id })}
                        style={{
                          display: "flex", alignItems: "center", gap: 16,
                          padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                          border: sel ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                          background: sel ? "#eff6ff" : "#fff",
                          boxShadow: sel ? "0 0 0 4px rgba(37,99,235,0.08)" : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        <AgentAvatar name={agent.name} size={46} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: sel ? "#2563eb" : "#0f172a" }}>{agent.name}</span>
                            {agent.telnyx_assistant_id && (
                              <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#059669", background: "#ecfdf5", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: 99, letterSpacing: 0.3 }}>● LIVE</span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: "0.75rem", color: "#64748b", flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: hasPhone ? "#059669" : "#e2e8f0", display: "inline-block" }} />
                              {hasPhone ? <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>{agent.phone_number}</span> : <span style={{ color: "#f59e0b" }}>No phone assigned</span>}
                            </span>
                            {agent.voice_id && <span>🎙 {agent.voice_id.split(".").pop()}</span>}
                            {agent.business_name && <span>🏢 {agent.business_name}</span>}
                          </div>
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          background: sel ? "#2563eb" : "#f1f5f9",
                          border: sel ? "none" : "2px solid #e2e8f0",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                      </div>
                    );
                  })}
                  <a href="/dashboard/agents/create" style={{ textAlign: "center", padding: "12px", border: "1.5px dashed #cbd5e1", borderRadius: 12, color: "#64748b", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", display: "block" }}>
                    + Create a new agent
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Leads ── */}
          {stepId === "leads" && (
            <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>Upload your lead list</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
                  Upload a CSV file. Required column: <strong>phone</strong>. Optional: <strong>name</strong>, <strong>email</strong>.
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />

              {data.parsedLeads.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed #cbd5e1", borderRadius: 16, padding: "3rem 2rem", textAlign: "center", cursor: "pointer", background: "#fafafa", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#fafafa"; }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📂</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#334155", marginBottom: 6 }}>Click to upload CSV file</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Supported: .csv, .txt · Columns: name, phone, email</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#ecfdf5", border: "1.5px solid #bbf7d0", borderRadius: 12, marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem", flexShrink: 0 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#065f46" }}>{data.parsedLeads.length} leads imported</div>
                      <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: 2 }}>from "{data.leadsFileName}"</div>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} style={{ marginLeft: "auto", background: "#fff", border: "1.5px solid #bbf7d0", borderRadius: 8, padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, color: "#059669", cursor: "pointer" }}>Replace</button>
                  </div>
                  <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr", padding: "8px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      <span>Name</span><span>Phone</span><span>Email</span>
                    </div>
                    {data.parsedLeads.slice(0, 8).map((lead, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr", padding: "8px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "0.78rem", color: "#334155" }}>
                        <span style={{ fontWeight: 600 }}>{lead.name}</span>
                        <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>{lead.phone}</span>
                        <span style={{ color: "#94a3b8" }}>{lead.email || "—"}</span>
                      </div>
                    ))}
                    {data.parsedLeads.length > 8 && (
                      <div style={{ padding: "8px 14px", fontSize: "0.72rem", color: "#94a3b8", textAlign: "center", background: "#f8fafc" }}>
                        + {data.parsedLeads.length - 8} more contacts
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => next()}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", marginTop: 16, padding: 0, display: "block" }}
              >
                Skip — upload leads after launch →
              </button>
            </div>
          )}

          {/* ── STEP 4: Schedule ── */}
          {stepId === "schedule" && (
            <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>Calling schedule & strategy</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>Choose how and when your agent places calls.</div>
              </div>

              {/* Strategy cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.5rem" }}>
                {STRATEGIES.map(s => {
                  const sel = data.strategy === s.id;
                  return (
                    <div key={s.id} onClick={() => upd({ strategy: s.id })} style={{
                      padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                      border: sel ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                      background: sel ? "#eff6ff" : "#fff",
                      transition: "all 0.15s", position: "relative",
                    }}>
                      <div style={{ fontSize: "1.25rem", marginBottom: 6 }}>{s.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: "0.84rem", color: sel ? "#2563eb" : "#0f172a", marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>{s.desc}</div>
                      {sel && <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.55rem", fontWeight: 800 }}>✓</div>}
                    </div>
                  );
                })}
              </div>

              {/* Timezone + window */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "1.25rem", background: "#f8fafc", borderRadius: 12, border: "1.5px solid #e2e8f0" }}>
                <div>
                  <label style={lbl}>Calling Timezone</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={data.callingWindowTimezone} onChange={e => upd({ callingWindowTimezone: e.target.value })}>
                    <option value="lead_local">Lead's Local Time (auto-detected via area code)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Europe/Paris">Central Europe (CET)</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Asia/Tokyo">Japan (JST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>Start Time</label><input type="time" style={inp} value={data.callingWindowStart} onChange={e => upd({ callingWindowStart: e.target.value })} /></div>
                  <div><label style={lbl}>End Time</label><input type="time" style={inp} value={data.callingWindowEnd} onChange={e => upd({ callingWindowEnd: e.target.value })} /></div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                  {[
                    { key: "speedToLead", val: data.speedToLead, label: "Speed-to-Lead", desc: "Call new leads the moment they're added", icon: "⚡" },
                    { key: "smsEnabled",  val: data.smsEnabled,  label: "SMS Follow-ups", desc: "Send text follow-up after unanswered calls",  icon: "💬" },
                  ].map(t => (
                    <div key={t.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: "1.1rem" }}>{t.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#0f172a" }}>{t.label}</div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.desc}</div>
                        </div>
                      </div>
                      <div
                        onClick={() => upd({ [t.key]: !t.val } as any)}
                        style={{ width: 44, height: 24, borderRadius: 12, background: t.val ? "#2563eb" : "#e2e8f0", cursor: "pointer", position: "relative", transition: "0.2s", flexShrink: 0 }}
                      >
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: t.val ? 22 : 2, transition: "0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Review & Launch ── */}
          {stepId === "launch" && (
            <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 4 }}>Review & Launch</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Everything looks good? Hit Launch to create your campaign.</div>
              </div>

              {/* Summary card */}
              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
                {/* Campaign row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>📣</div>
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Campaign</div>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{data.name}</div>
                  </div>
                </div>

                {/* Agent row */}
                {selectedAgent && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                    <AgentAvatar name={selectedAgent.name} size={40} />
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>AI Agent</div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{selectedAgent.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                        {selectedAgent.phone_number ? <span style={{ fontFamily: "monospace" }}>{selectedAgent.phone_number}</span> : <span style={{ color: "#f59e0b" }}>⚠ No phone assigned</span>}
                        {selectedAgent.voice_id && <span> · 🎙 {selectedAgent.voice_id.split(".").pop()}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Leads row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: data.parsedLeads.length > 0 ? "#ecfdf5" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {data.parsedLeads.length > 0 ? "✅" : "📋"}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Leads</div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: data.parsedLeads.length > 0 ? "#059669" : "#64748b" }}>
                      {data.parsedLeads.length > 0 ? `${data.parsedLeads.length} contacts ready` : "None uploaded yet — add after launch"}
                    </div>
                  </div>
                </div>

                {/* Schedule row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🕐</div>
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Schedule</div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                      {STRATEGIES.find(s => s.id === data.strategy)?.label} · {data.callingWindowStart}–{data.callingWindowEnd}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
                      {data.callingWindowTimezone === "lead_local" ? "Lead's local time" : data.callingWindowTimezone}
                      {data.speedToLead && " · ⚡ Speed-to-Lead ON"}
                      {data.smsEnabled && " · 💬 SMS ON"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress / Error */}
              {launchProgress && (
                <div style={{ background: launchProgress.includes("✅") ? "#ecfdf5" : "#eff6ff", border: `1.5px solid ${launchProgress.includes("✅") ? "#bbf7d0" : "#bfdbfe"}`, borderRadius: 10, padding: "12px 16px", fontSize: "0.85rem", color: launchProgress.includes("✅") ? "#059669" : "#2563eb", fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                  {!launchProgress.includes("✅") && <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2.5px solid rgba(37,99,235,0.25)", borderTopColor: "#2563eb", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
                  {launchProgress}
                </div>
              )}
              {launchError && (
                <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>
                  ⚠ {launchError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: "1rem 1.75rem", borderTop: "1.5px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            disabled={launching}
            style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 20px", fontSize: "0.85rem", fontWeight: 700, color: "#64748b", cursor: "pointer", opacity: launching ? 0.5 : 1 }}
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
            Step {step + 1} of {WIZARD_STEPS.length}
          </div>
          <button
            onClick={next}
            disabled={!canContinue() || launching}
            style={{
              background: canContinue() && !launching ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#e2e8f0",
              color: canContinue() && !launching ? "#fff" : "#94a3b8",
              border: "none", borderRadius: 10, padding: "10px 28px",
              fontSize: "0.88rem", fontWeight: 800,
              cursor: canContinue() && !launching ? "pointer" : "not-allowed",
              boxShadow: canContinue() && !launching ? "0 4px 14px rgba(37,99,235,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {launching ? "Launching…" : step === WIZARD_STEPS.length - 1 ? "🚀 Launch Campaign" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE — REAL API
═══════════════════════════════════════════════════════════════════ */
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [activating, setActivating] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const loadData = useCallback(async () => {
    const tid = getTenantId();
    const [campaignData, agentData] = await Promise.all([
      fetchCampaigns(tid),
      fetchAgents(tid),
    ]);
    setCampaigns(campaignData);
    setAgents(agentData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load stats when a campaign is selected
  useEffect(() => {
    if (selectedCampaign) {
      const tid = getTenantId();
      fetchCampaignStats(selectedCampaign.id, tid).then(setCampaignStats).catch(() => setCampaignStats(null));
    }
  }, [selectedCampaign]);

  const handleBuilderComplete = async () => {
    setShowBuilder(false);
    showToast("✅ Campaign created successfully!");
    await loadData();
  };

  const handleActivate = async () => {
    if (!selectedCampaign) return;
    setActivating(true);
    try {
      const tid = getTenantId();
      await updateCampaign(selectedCampaign.id, tid, { status: "active" });
      showToast("🚀 Campaign activated! Dialing will begin.");
      await loadData();
      setSelectedCampaign(prev => prev ? { ...prev, status: "active" } : prev);
    } catch {
      showToast("⚠️ Failed to activate campaign.");
    }
    setActivating(false);
  };

  const handlePause = async () => {
    if (!selectedCampaign) return;
    try {
      const tid = getTenantId();
      const newStatus = selectedCampaign.status === "active" ? "inactive" : "active";
      await updateCampaign(selectedCampaign.id, tid, { status: newStatus });
      showToast(newStatus === "active" ? "▶️ Campaign resumed" : "⏸️ Campaign paused");
      await loadData();
      setSelectedCampaign(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch {
      showToast("⚠️ Action failed.");
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign || !confirm("Delete this campaign and all its leads? This cannot be undone.")) return;
    try {
      const tid = getTenantId();
      await deleteCampaign(selectedCampaign.id, tid);
      showToast("🗑️ Campaign deleted.");
      setSelectedCampaign(null);
      setSelectedNode(null);
      await loadData();
    } catch {
      showToast("⚠️ Failed to delete campaign.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#94a3b8", fontSize: "0.9rem", fontWeight: 600 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.7s linear infinite", marginRight: 10 }} />
        Loading campaigns…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Builder Modal */}
      {showBuilder && <BuilderModal onClose={() => setShowBuilder(false)} onComplete={handleBuilderComplete} existingAgents={agents} tenantId={getTenantId()} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 500, background: toast.includes("⚠️") ? "#ef4444" : "#059669", color: "#fff", borderRadius: 12, padding: "14px 22px", fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", fontSize: "0.88rem", animation: "popIn 0.3s ease" }}>
          {toast}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {campaigns.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>Outbound Campaigns</h1>
              <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "0.85rem" }}>AI-powered outbound call pipeline.</p>
            </div>
            <button onClick={() => setShowBuilder(true)} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}>
              + Create Campaign
            </button>
          </div>
          <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "5rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1.25rem" }}>📣</div>
            <h2 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a", margin: "0 0 0.6rem" }}>No Campaigns Yet</h2>
            <p style={{ color: "#64748b", fontSize: "0.88rem", maxWidth: 400, margin: "0 auto 1.75rem", lineHeight: 1.6 }}>Create your first outbound campaign. Our guided wizard will set up your AI agent, phone number, lead list, and calling strategy.</p>
            <button onClick={() => setShowBuilder(true)} style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>
              + Create Your First Campaign
            </button>
            <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "2.5rem" }}>
              {[{ icon: "🤖", label: "Telnyx AI agents" }, { icon: "📋", label: "CSV lead upload" }, { icon: "📊", label: "Real-time analytics" }].map(f => (
                <div key={f.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS DASHBOARD ── */}
      {campaigns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "calc(100vh - 64px - 4.5rem)", minHeight: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.3rem", color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>Outbound Campaigns</h1>
              <p style={{ color: "#64748b", margin: "3px 0 0", fontSize: "0.82rem" }}>{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} · Click any node to configure</p>
            </div>
            <button onClick={() => setShowBuilder(true)} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}>
              + Create Campaign
            </button>
          </div>

          {/* Body: sidebar + pipeline + drawer */}
          <div style={{ display: "flex", gap: "1rem", flex: 1, minHeight: 0 }}>
            {/* Campaign list */}
            <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, padding: "0 4px", marginBottom: 4 }}>My Campaigns</div>
              {campaigns.map(c => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.inactive;
                return (
                  <div key={c.id} onClick={() => { setSelectedCampaign(c); setSelectedNode(null); setCampaignStats(null); }} style={{ background: selectedCampaign?.id === c.id ? "#eff6ff" : "#fff", border: selectedCampaign?.id === c.id ? "2px solid #2563eb" : "1.5px solid #e2e8f0", borderRadius: 11, padding: "11px 13px", cursor: "pointer", transition: "all 0.18s" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#0f172a", marginBottom: 5 }}>{c.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.65rem", fontWeight: 700, color: sc.text, background: sc.bg, padding: "2px 7px", borderRadius: 99 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />{c.status}
                      </span>
                      <span style={{ fontSize: "0.6rem", color: "#94a3b8", marginLeft: "auto" }}>{c.leads_count} leads</span>
                    </div>
                  </div>
                );
              })}
              <div onClick={() => setShowBuilder(true)} style={{ border: "1.5px dashed #e2e8f0", borderRadius: 11, padding: "10px", cursor: "pointer", textAlign: "center", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600 }}>+ New Campaign</div>
            </div>

            {/* Pipeline canvas */}
            {selectedCampaign && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 }}>
                {/* Campaign bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 11, flexShrink: 0, flexWrap: "wrap" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>📣</div>
                  <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>{selectedCampaign.name}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: (STATUS_COLORS[selectedCampaign.status] || STATUS_COLORS.inactive).text, background: (STATUS_COLORS[selectedCampaign.status] || STATUS_COLORS.inactive).bg, borderRadius: 99, padding: "2px 8px" }}>● {selectedCampaign.status}</span>
                  <span style={{ fontSize: "0.65rem", color: "#94a3b8", marginLeft: "auto" }}>Agent: {selectedCampaign.agent_name} · {selectedCampaign.agent_phone || "No phone"}</span>
                </div>

                {/* Dot-grid pipeline canvas */}
                <div style={{ flex: 1, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "1.75rem", position: "relative", backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)", backgroundSize: "22px 22px", overflowX: "auto", overflowY: "auto" }}>
                  <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem" }}>
                    {[
                      { label: "1. LEAD SOURCE", w: 294 },
                      { label: "2. AI AGENT", w: 294 },
                      { label: "3. ANALYTICS", w: 220 },
                    ].map(s => (
                      <div key={s.label} style={{ width: s.w, flexShrink: 0 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <PipeNode icon="📋" title={selectedCampaign.name} sub={`${selectedCampaign.leads_count} leads · ${selectedCampaign.calling_window_start}–${selectedCampaign.calling_window_end}`} color="#2563eb" bgColor="#eff6ff" selected={selectedNode === "list"} onClick={() => setSelectedNode(selectedNode === "list" ? null : "list")} actionLabel="Configure" />
                    <PipeArrow color="#2563eb" />
                    <PipeNode icon="🤖" title={selectedCampaign.agent_name} sub={`${selectedCampaign.agent_phone || "No phone"} · Telnyx AI`} color="#059669" bgColor="#ecfdf5" selected={selectedNode === "agent"} onClick={() => setSelectedNode(selectedNode === "agent" ? null : "agent")} actionLabel="Configure" />
                    <PipeArrow color="#f59e0b" />
                    <PipeNode icon="📊" title="Analytics" sub="Live performance" color="#7c3aed" bgColor="#f5f3ff" selected={selectedNode === "analytics"} onClick={() => setSelectedNode(selectedNode === "analytics" ? null : "analytics")} actionLabel="View Results" />
                  </div>

                  {/* Actions */}
                  <div style={{ position: "absolute", bottom: 18, right: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={handleDelete} style={{ background: "#fff", border: "1.5px solid #fecaca", borderRadius: 9, padding: "8px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", color: "#ef4444" }}>🗑️ Delete</button>
                    {selectedCampaign.status === "active" && (
                      <button onClick={handlePause} style={{ background: "#fff", border: "2px solid #e2e8f0", borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", color: "#334155" }}>⏸️ Pause</button>
                    )}
                    <button onClick={selectedCampaign.status === "active" ? handlePause : handleActivate} disabled={activating} style={{ background: selectedCampaign.status === "active" ? "#059669" : "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)", display: "flex", alignItems: "center", gap: 8, opacity: activating ? 0.7 : 1 }}>
                      {activating ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Activating…</> : selectedCampaign.status === "active" ? "● Running" : "🚀 Activate Campaign"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right config drawer */}
            {selectedNode && selectedCampaign && (
              <div style={{ width: 270, flexShrink: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeSlideIn 0.2s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1.5px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>
                    {selectedNode === "list" ? "📋 Lead List" : selectedNode === "agent" ? "🤖 AI Agent" : "📊 Analytics"}
                  </span>
                  <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                </div>
                <div style={{ padding: "1.25rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {selectedNode === "list" && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#eff6ff", borderRadius: 8, fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>
                        📋 {selectedCampaign.leads_count} leads loaded
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>
                        Calling window: <strong>{selectedCampaign.calling_window_start}</strong> – <strong>{selectedCampaign.calling_window_end}</strong>
                      </div>
                      <Link href="/dashboard/leads" style={{ textDecoration: "none" }}>
                        <button style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Manage Leads →</button>
                      </Link>
                    </>
                  )}
                  {selectedNode === "agent" && (
                    <>
                      <div style={{ background: "#ecfdf5", borderRadius: 8, padding: "8px 10px", fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>🤖 {selectedCampaign.agent_name}</div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>Phone: <strong>{selectedCampaign.agent_phone || "Not assigned"}</strong></div>
                      <Link href="/dashboard/agents" style={{ textDecoration: "none" }}>
                        <button style={{ width: "100%", background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Open Agent Settings →</button>
                      </Link>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.5 }}>Edit prompt, voice, knowledge base, and tools in the full agent editor.</div>
                    </>
                  )}
                  {selectedNode === "analytics" && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                        {[
                          { label: "Total", val: campaignStats?.total_leads ?? "—" },
                          { label: "Answered", val: campaignStats?.by_status?.answered ?? "—" },
                          { label: "Voicemail", val: campaignStats?.by_status?.voicemail ?? "—" },
                          { label: "Pending", val: campaignStats?.by_status?.pending ?? "—" },
                          { label: "Failed", val: campaignStats?.by_status?.failed ?? "—" },
                          { label: "Opted Out", val: campaignStats?.by_status?.opted_out ?? "—" },
                        ].map(m => (
                          <div key={m.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>{m.val}</div>
                            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                      <Link href="/dashboard/calls" style={{ textDecoration: "none" }}>
                        <button style={{ width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>View All Call Logs →</button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
