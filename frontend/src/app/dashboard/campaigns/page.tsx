"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getTenantId, fetchAgents, fetchCampaigns, createAgent,
  searchNumbers, purchaseNumber, createCampaignAPI, updateCampaign,
  uploadCampaignLeads, fetchCampaignStats, fetchIntegrations,
  deleteCampaign, API_BASE_URL,
  fetchVoices,
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

interface TelnyxNumber {
  phone_number: string;
  monthly_cost: number;
  upfront_cost: number;
  total_initial: number;
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
  { id: "setup",         label: "Setup",         icon: "⚙️" },
  { id: "agent",         label: "Agent",          icon: "🤖" },
  { id: "agent_setup",   label: "Agent Setup",    icon: "✨" },
  { id: "channels",      label: "Phone Number",   icon: "📞" },
  { id: "apps",          label: "Integrations",   icon: "🔌" },
  { id: "list",          label: "Lead List",      icon: "📋" },
  { id: "strategy",      label: "Strategy",       icon: "🎯" },
  { id: "review",        label: "Review & Launch", icon: "🚀" },
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
   BUILDER WIZARD MODAL (FULLY WIRED TO REAL APIs)
═══════════════════════════════════════════════════════════════════ */
interface BuilderState {
  name: string;
  useExistingAgent: boolean;
  existingAgentId: string;
  agentName: string;
  businessName: string;
  businessContext: string;
  voiceId: string;
  phoneOption: "existing" | "search" | "skip";
  selectedPhone: string;
  parsedLeads: ParsedLead[];
  leadsFileName: string;
  strategy: string;
  callingWindowTimezone: string;
  callingWindowStart: string;
  callingWindowEnd: string;
  speedToLead: boolean;
  smsEnabled: boolean;
}

function BuilderModal({ onClose, onComplete, existingAgents, tenantId }: {
  onClose: () => void;
  onComplete: () => void;
  existingAgents: AgentData[];
  tenantId: string;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BuilderState>({
    name: "", useExistingAgent: false, existingAgentId: "",
    agentName: "", businessName: "", businessContext: "", voiceId: "Telnyx.Ultra.Grace",
    phoneOption: "existing", selectedPhone: "",
    parsedLeads: [], leadsFileName: "", strategy: "immediate",
    callingWindowTimezone: "lead_local", callingWindowStart: "09:00", callingWindowEnd: "20:00",
    speedToLead: false, smsEnabled: false,
  });

  // Real API states
  const [searchedNumbers, setSearchedNumbers] = useState<TelnyxNumber[]>([]);
  const [numberSearching, setNumberSearching] = useState(false);
  const [numberSearchError, setNumberSearchError] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchProgress, setLaunchProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepId = WIZARD_STEPS[step].id;
  const progress = Math.round((step / WIZARD_STEPS.length) * 100);

  // Load integrations when reaching the apps step
  useEffect(() => {
    if (stepId === "apps" && !integrationStatus) {
      fetchIntegrations(tenantId).then(setIntegrationStatus).catch(() => {});
    }
  }, [stepId, tenantId, integrationStatus]);

  const upd = (patch: Partial<BuilderState>) => setData(d => ({ ...d, ...patch }));

  const canContinue = () => {
    if (stepId === "setup")       return data.name.trim().length > 0;
    if (stepId === "agent")       return data.useExistingAgent ? data.existingAgentId.length > 0 : data.agentName.trim().length > 0;
    if (stepId === "strategy")    return data.strategy.length > 0;
    return true;
  };

  // Search Telnyx for phone numbers
  const handleSearchNumbers = async () => {
    setNumberSearching(true);
    setNumberSearchError("");
    try {
      const result = await searchNumbers(tenantId, "US", areaCode);
      setSearchedNumbers(result.numbers || []);
      if ((result.numbers || []).length === 0) {
        setNumberSearchError("No numbers found. Try a different area code.");
      }
    } catch (err: any) {
      setNumberSearchError(err.message?.includes("402") ? "Phone provisioning requires a paid plan. Upgrade first." : "Failed to search numbers.");
    }
    setNumberSearching(false);
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const leads = parseCSV(text);
      upd({ parsedLeads: leads, leadsFileName: file.name });
    };
    reader.readAsText(file);
  };

  // LAUNCH — the real deal: create agent → purchase number → create campaign → upload leads
  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError("");
    try {
      let agentId: string;

      // Step 1: Create or reuse agent
      if (data.useExistingAgent) {
        agentId = data.existingAgentId;
        setLaunchProgress("Using existing agent…");
      } else {
        setLaunchProgress("Creating AI agent on Telnyx…");
        const systemPrompt = `You are ${data.agentName}, an AI calling agent for ${data.businessName || "the business"}. ${data.businessContext || "Help callers with their questions and book appointments."} Be professional, warm, and helpful. Always introduce yourself by name.`;
        const agentResult = await createAgent({
          tenant_id: tenantId,
          name: data.agentName,
          business_name: data.businessName || undefined,
          system_prompt: systemPrompt,
          voice_id: data.voiceId,
        });
        agentId = agentResult.id;
      }

      // Step 2: Purchase phone number (if selected from search)
      if (data.selectedPhone && data.phoneOption === "search") {
        setLaunchProgress("Purchasing phone number from Telnyx…");
        try {
          await purchaseNumber(data.selectedPhone, tenantId, agentId);
        } catch (err: any) {
          console.warn("Phone purchase failed (may already be assigned):", err.message);
        }
      }

      // Step 3: Create campaign
      setLaunchProgress("Creating campaign…");
      const campaign = await createCampaignAPI({
        tenant_id: tenantId,
        agent_id: agentId,
        name: data.name,
        calling_window_timezone: data.callingWindowTimezone,
        calling_window_start: data.callingWindowStart,
        calling_window_end: data.callingWindowEnd,
        speed_to_lead_enabled: data.speedToLead,
        sms_enabled: data.smsEnabled,
      });

      // Step 4: Upload leads (if any)
      if (data.parsedLeads.length > 0) {
        setLaunchProgress(`Uploading ${data.parsedLeads.length} leads…`);
        await uploadCampaignLeads(campaign.id, tenantId, data.parsedLeads);
      }

      setLaunchProgress("✅ Campaign created successfully!");
      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch (err: any) {
      setLaunchError(err.message || "Something went wrong. Check your connection and try again.");
      setLaunching(false);
    }
  };

  const next = () => {
    if (step < WIZARD_STEPS.length - 1) setStep(s => s + 1);
    else handleLaunch();
  };

  // Agents that already have phone numbers
  const agentsWithPhone = existingAgents.filter(a => a.phone_number);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20,
        width: "100%", maxWidth: 960, height: "min(700px, 90vh)",
        display: "grid", gridTemplateColumns: "200px 1fr 360px",
        gridTemplateRows: "1fr auto",
        overflow: "hidden",
        boxShadow: "0 25px 80px rgba(0,0,0,0.25)",
      }}>

        {/* ── LEFT: Progress sidebar ── */}
        <div style={{ background: "#f8fafc", borderRight: "1.5px solid #e2e8f0", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gridRow: "1 / 3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8" }}>Progress</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#2563eb" }}>{progress}%</span>
          </div>
          <div style={{ height: 4, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", marginBottom: "1.25rem" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(to right, #2563eb, #3b82f6)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          {WIZARD_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} onClick={() => i <= step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, cursor: i <= step ? "pointer" : "default", background: active ? "#fff" : "transparent", border: active ? "1px solid #e2e8f0" : "1px solid transparent", marginBottom: 2, boxShadow: active ? "0 1px 4px rgba(0,0,0,0.05)" : "none" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#059669" : active ? "#2563eb" : "#e2e8f0", fontSize: "0.6rem", fontWeight: 800, color: done || active ? "#fff" : "#94a3b8" }}>{done ? "✓" : i + 1}</div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: active ? "#2563eb" : done ? "#059669" : "#94a3b8" }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── CENTER: Chat transcript ── */}
        <div style={{ background: "#f8fafc", padding: "1.75rem 1.5rem 1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Step {step + 1} of {WIZARD_STEPS.length}</div>
          {[
            { show: true, label: "System", text: "Let's set up your outbound campaign system. Start with a name." },
            { show: data.name.length > 0, label: "You", text: `System name: "${data.name}"`, bubble: true },
            { show: step >= 1, label: "System", text: data.useExistingAgent ? "Select an existing AI agent for this campaign." : "Name your AI agent — this is who makes the calls." },
            { show: data.useExistingAgent && data.existingAgentId, label: "You", text: `Using agent: "${existingAgents.find(a => a.id === data.existingAgentId)?.name || "—"}"`, bubble: true },
            { show: !data.useExistingAgent && data.agentName.length > 0, label: "You", text: `New agent: "${data.agentName}"`, bubble: true },
            { show: step >= 2, label: "System", text: "Provide business context. We'll auto-generate the agent's call script." },
            { show: step >= 3, label: "System", text: "Assign a phone number — your agent dials from this number." },
            { show: !!data.selectedPhone, label: "You", text: `Phone: ${data.selectedPhone}`, bubble: true },
            { show: step >= 4, label: "System", text: "Connect integrations for calendar booking and CRM sync." },
            { show: step >= 5, label: "System", text: "Upload your lead list. Your agent will dial through these contacts." },
            { show: data.parsedLeads.length > 0, label: "You", text: `Uploaded: ${data.parsedLeads.length} leads from "${data.leadsFileName}"`, bubble: true },
            { show: step >= 6, label: "System", text: "Choose a calling strategy — how and when your agent dials." },
            { show: data.strategy.length > 0 && step >= 6, label: "You", text: `Strategy: ${STRATEGIES.find(s => s.id === data.strategy)?.label || data.strategy}`, bubble: true },
            { show: step >= 7, label: "System", text: "Review your setup and launch when ready! 🚀" },
          ].filter(m => m.show).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: (m as any).bubble ? "flex-end" : "flex-start", animation: "fadeSlideIn 0.25s ease" }}>
              {(m as any).bubble ? (
                <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", borderRadius: "12px 12px 4px 12px", padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600, maxWidth: "80%" }}>{m.text}</div>
              ) : (
                <div style={{ display: "flex", gap: 8, maxWidth: "90%", alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", flexShrink: 0, marginTop: 1 }}>✦</div>
                  <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{m.label}</div>
                    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "0 12px 12px 12px", padding: "9px 13px", fontSize: "0.8rem", color: "#334155", lineHeight: 1.5, fontWeight: 600 }}>{m.text}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── RIGHT: Active form ── */}
        <div style={{ borderLeft: "1.5px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1.5px solid #f1f5f9" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5 }}>{WIZARD_STEPS[step].label}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <div style={{ padding: "1.25rem", flex: 1 }}>

            {/* Step 0: Campaign Name */}
            {stepId === "setup" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Name your campaign</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 1rem", lineHeight: 1.5 }}>A descriptive name to identify this outbound campaign.</p>
                <input autoFocus type="text" style={inp} value={data.name} onChange={e => upd({ name: e.target.value })} placeholder="e.g. Black Friday Outreach" onFocus={e => e.target.style.borderColor = "#2563eb"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} onKeyDown={e => e.key === "Enter" && canContinue() && next()} />
              </div>
            )}

            {/* Step 1: Agent Selection */}
            {stepId === "agent" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0 }}>Choose your AI agent</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>Use an existing agent or create a new one.</p>

                {/* Toggle */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1.5px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
                  <button onClick={() => upd({ useExistingAgent: false })} style={{ padding: "9px", fontSize: "0.78rem", fontWeight: 700, background: !data.useExistingAgent ? "#eff6ff" : "#fff", color: !data.useExistingAgent ? "#2563eb" : "#64748b", border: "none", cursor: "pointer" }}>Create New</button>
                  <button onClick={() => upd({ useExistingAgent: true })} style={{ padding: "9px", fontSize: "0.78rem", fontWeight: 700, background: data.useExistingAgent ? "#eff6ff" : "#fff", color: data.useExistingAgent ? "#2563eb" : "#64748b", border: "none", borderLeft: "1.5px solid #e2e8f0", cursor: "pointer" }}>Use Existing ({existingAgents.length})</button>
                </div>

                {data.useExistingAgent ? (
                  existingAgents.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>No agents found. Create a new one instead.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 300, overflowY: "auto" }}>
                      {existingAgents.map(agent => (
                        <div key={agent.id} onClick={() => upd({ existingAgentId: agent.id, selectedPhone: agent.phone_number || "" })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, cursor: "pointer", border: data.existingAgentId === agent.id ? "2px solid #2563eb" : "1.5px solid #e2e8f0", background: data.existingAgentId === agent.id ? "#eff6ff" : "#fff", transition: "all 0.15s" }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>🤖</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{agent.name}</div>
                            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{agent.phone_number || "No phone"} · {agent.voice_id || "Default Voice"}</div>
                          </div>
                          {agent.telnyx_assistant_id && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 6px", borderRadius: 4 }}>✓ Live</span>}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div>
                    <label style={lbl}>Agent Name</label>
                    <input autoFocus type="text" style={inp} value={data.agentName} onChange={e => upd({ agentName: e.target.value })} placeholder="e.g. Sam, Alex, Jordan" onFocus={e => e.target.style.borderColor = "#2563eb"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                    <div style={{ marginTop: "0.75rem", background: "#eff6ff", borderRadius: 9, padding: "10px 13px", fontSize: "0.75rem", color: "#2563eb", lineHeight: 1.5, fontWeight: 500 }}>
                      💡 First names work best — they sound more natural on calls.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Agent Setup */}
            {stepId === "agent_setup" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0 }}>Configure {data.useExistingAgent ? "campaign context" : (data.agentName || "your agent")}</h3>
                {data.useExistingAgent ? (
                  <div style={{ background: "#ecfdf5", borderRadius: 8, padding: "10px 13px", fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>✓ Using existing agent. You can skip this step or add extra campaign context below.</div>
                ) : null}
                <div><label style={lbl}>Business Name</label><input type="text" style={inp} value={data.businessName} onChange={e => upd({ businessName: e.target.value })} placeholder="Your Company LLC" onFocus={e => e.target.style.borderColor = "#2563eb"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
                <div><label style={lbl}>Campaign Context</label><textarea rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} value={data.businessContext} onChange={e => upd({ businessContext: e.target.value })} placeholder="Who are you calling? What's the goal of this campaign?" onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#2563eb"} onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#e2e8f0"} /></div>
                {!data.useExistingAgent && (
                  <div><label style={lbl}>Voice</label>
                    <select style={inp} value={data.voiceId} onChange={e => upd({ voiceId: e.target.value })}>
                      <option value="Telnyx.Ultra.Grace">Grace (Female)</option>
                      <option value="Telnyx.Ultra.George">George (Male)</option>
                      <option value="Telnyx.Ultra.Ava">Ava (Female)</option>
                      <option value="Telnyx.Ultra.Marcus">Marcus (Male)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Phone Number (REAL API) */}
            {stepId === "channels" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0 }}>Assign phone number</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>Your agent dials from this number. Use an existing one or get a new Telnyx number.</p>

                {/* Existing agent phone numbers */}
                {agentsWithPhone.length > 0 && (
                  <>
                    <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Existing Numbers</div>
                    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                      {agentsWithPhone.map(a => (
                        <div key={a.id} onClick={() => upd({ selectedPhone: a.phone_number!, phoneOption: "existing" })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: data.selectedPhone === a.phone_number ? "#eff6ff" : "#fff", transition: "background 0.15s" }}>
                          <span style={{ fontSize: "0.75rem" }}>📞</span>
                          <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, flex: 1 }}>{a.phone_number}</span>
                          <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{a.name}</span>
                          {data.selectedPhone === a.phone_number && <span style={{ fontSize: "0.7rem", color: "#2563eb", fontWeight: 800 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Search new numbers */}
                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 }}>Search New Numbers (Telnyx)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" style={{ ...inp, flex: 1 }} value={areaCode} onChange={e => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Area code (e.g. 212)" onFocus={e => e.target.style.borderColor = "#2563eb"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                  <button onClick={handleSearchNumbers} disabled={numberSearching} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: numberSearching ? 0.7 : 1 }}>
                    {numberSearching ? "Searching…" : "🔍 Search"}
                  </button>
                </div>
                {numberSearchError && <div style={{ fontSize: "0.75rem", color: numberSearchError.includes("402") ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>{numberSearchError}</div>}
                {searchedNumbers.length > 0 && (
                  <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, maxHeight: 180, overflowY: "auto" }}>
                    {searchedNumbers.map(num => (
                      <div key={num.phone_number} onClick={() => upd({ selectedPhone: num.phone_number, phoneOption: "search" })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: data.selectedPhone === num.phone_number ? "#eff6ff" : "#fff" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, flex: 1 }}>{num.phone_number}</span>
                        {data.selectedPhone === num.phone_number && <span style={{ fontSize: "0.7rem", color: "#2563eb", fontWeight: 800 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => { upd({ selectedPhone: "", phoneOption: "skip" }); next(); }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}>Skip — assign a number later →</button>
              </div>
            )}

            {/* Step 4: Integrations (REAL API) */}
            {stepId === "apps" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0 }}>Integrations</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>Connect calendar and CRM so your agent can book appointments and sync data.</p>
                <div className="integration-guide" style={{ background: "#f8fafc", borderLeft: "4px solid #2563eb", padding: "1rem", borderRadius: "8px", marginTop: "0.75rem" }}>
                  <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: "0.5rem" }}>Integration Setup Guide</h4>
                  <ul style={{ marginLeft: "1.2rem", color: "#64748b", fontSize: "0.78rem", lineHeight: 1.4 }}>
                    <li><strong>Google Workspace</strong> – Calendar & Sheets access. OAuth scopes: <code>https://www.googleapis.com/auth/calendar</code> and <code>https://www.googleapis.com/auth/spreadsheets</code>.</li>
                    <li><strong>HubSpot CRM</strong> – API key or Private App token. Required scopes: <code>contacts</code>, <code>crm.objects.contacts.read</code>.</li>
                    <li><strong>Salesforce</strong> – Connected App client ID/secret. OAuth redirect URL: <code>{`${API_BASE_URL}/salesforce/callback`}</code>. Scopes: <code>api</code>, <code>refresh_token</code>.</li>
                    <li><strong>Shopify</strong> – Store URL (e.g., <code>myshop.myshopify.com</code>) and Admin API access token.</li>
                    <li><strong>Custom Webhook</strong> – Full HTTPS endpoint. Payload format: <code>{`{event, data}`}</code>.</li>
                    <li><strong>Airtable</strong> – API key, Base ID, and Table name for call logs.</li>
                  </ul>
                </div>

                {!integrationStatus ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>Loading integrations…</div>
                ) : (
                  <>
                    {/* Google */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${integrationStatus.google_connected ? "#059669" : "#e2e8f0"}`, background: integrationStatus.google_connected ? "#f0fdf4" : "#fff" }}>
                      <span style={{ fontSize: "1rem" }}>📅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>Google Workspace</div>
                        <div style={{ fontSize: "0.68rem", color: integrationStatus.google_connected ? "#059669" : "#94a3b8" }}>{integrationStatus.google_connected ? "✓ Connected — Calendar & Sheets" : "Not connected"}</div>
                      </div>
                      {integrationStatus.google_connected ? (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 8px", borderRadius: 5 }}>✓ ON</span>
                      ) : (
                        <a href={`${API_BASE_URL}/google/install?tenant_id=${tenantId}`} style={{ textDecoration: "none" }}><button style={{ padding: "5px 12px", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, border: "1.5px solid #2563eb", background: "#fff", color: "#2563eb", cursor: "pointer" }}>Connect →</button></a>
                      )}
                    </div>

                    {/* HubSpot CRM */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${integrationStatus.hubspot_connected ? "#ff7a59" : "#e2e8f0"}`, background: integrationStatus.hubspot_connected ? "#fff7ed" : "#fff" }}>
                      <span style={{ fontSize: "1rem" }}>🟠</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>HubSpot CRM</div>
                        <div style={{ fontSize: "0.68rem", color: integrationStatus.hubspot_connected ? "#d97706" : "#94a3b8" }}>{integrationStatus.hubspot_connected ? "✓ Connected — Syncing leads" : "Not connected"}</div>
                      </div>
                      {integrationStatus.hubspot_connected ? (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#d97706", background: "#fef3c7", padding: "3px 8px", borderRadius: 5 }}>✓ ON</span>
                      ) : (
                        <a href={`${API_BASE_URL}/hubspot/install?tenant_id=${tenantId}`} style={{ textDecoration: "none" }}><button style={{ padding: "5px 12px", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, border: "1.5px solid #ff7a59", background: "#fff", color: "#ff7a59", cursor: "pointer" }}>Connect →</button></a>
                      )}
                    </div>

                    {/* Salesforce */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${integrationStatus.salesforce_connected ? "#00a1e0" : "#e2e8f0"}`, background: integrationStatus.salesforce_connected ? "#f0f9ff" : "#fff" }}>
                      <span style={{ fontSize: "1rem" }}>☁️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>Salesforce</div>
                        <div style={{ fontSize: "0.68rem", color: integrationStatus.salesforce_connected ? "#0c4a6e" : "#94a3b8" }}>{integrationStatus.salesforce_connected ? "✓ Connected — Enterprise sync" : "Not connected"}</div>
                      </div>
                      {integrationStatus.salesforce_connected ? (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#00a1e0", background: "#e0f2fe", padding: "3px 8px", borderRadius: 5 }}>✓ ON</span>
                      ) : (
                        <a href={`${API_BASE_URL}/salesforce/install?tenant_id=${tenantId}`} style={{ textDecoration: "none" }}><button style={{ padding: "5px 12px", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, border: "1.5px solid #00a1e0", background: "#fff", color: "#00a1e0", cursor: "pointer" }}>Connect →</button></a>
                      )}
                    </div>

                    {/* Shopify */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${integrationStatus.shopify_store_url ? "#10b981" : "#e2e8f0"}`, background: integrationStatus.shopify_store_url ? "#ecfdf5" : "#fff" }}>
                      <span style={{ fontSize: "1rem" }}>🛍️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>Shopify</div>
                        <div style={{ fontSize: "0.68rem", color: integrationStatus.shopify_store_url ? "#047857" : "#94a3b8" }}>{integrationStatus.shopify_store_url ? `✓ Connected to ${integrationStatus.shopify_store_url}` : "Not connected"}</div>
                      </div>
                      {integrationStatus.shopify_store_url ? (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "3px 8px", borderRadius: 5 }}>✓ ON</span>
                      ) : (
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8" }}>Set up in Integrations</span>
                      )}
                    </div>

                    {/* Webhook */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${integrationStatus.webhook_url ? "#8b5cf6" : "#e2e8f0"}`, background: integrationStatus.webhook_url ? "#f5f3ff" : "#fff" }}>
                      <span style={{ fontSize: "1rem" }}>🔗</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>Custom Webhook</div>
                        <div style={{ fontSize: "0.68rem", color: integrationStatus.webhook_url ? "#5b21b6" : "#94a3b8" }}>{integrationStatus.webhook_url ? "✓ Active — Data forwarding" : "Not connected"}</div>
                      </div>
                      {integrationStatus.webhook_url ? (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "3px 8px", borderRadius: 5 }}>✓ ON</span>
                      ) : (
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8" }}>Set up in Integrations</span>
                      )}
                    </div>

                    {/* Airtable */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${integrationStatus.airtable_connected ? "#18bfff" : "#e2e8f0"}`, background: integrationStatus.airtable_connected ? "#ecfeff" : "#fff" }}>
                      <span style={{ fontSize: "1rem" }}>📊</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>Airtable</div>
                        <div style={{ fontSize: "0.68rem", color: integrationStatus.airtable_connected ? "#0891b2" : "#94a3b8" }}>{integrationStatus.airtable_connected ? "✓ Connected — Call logging active" : "Not connected"}</div>
                      </div>
                      {integrationStatus.airtable_connected ? (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0891b2", background: "#ecfeff", padding: "3px 8px", borderRadius: 5 }}>✓ ON</span>
                      ) : (
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8" }}>Set up in Integrations</span>
                      )}
                    </div>

                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.5, marginTop: 4 }}>
                      You can also configure integrations later from the Integrations page.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 5: Lead List (CSV upload) */}
            {stepId === "list" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0 }}>Import lead list</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>Upload a CSV file with your leads. Required column: <strong>phone</strong>. Optional: name, email.</p>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
                <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${data.parsedLeads.length > 0 ? "#059669" : "#cbd5e1"}`, borderRadius: 10, padding: "1.5rem", textAlign: "center", cursor: "pointer", background: data.parsedLeads.length > 0 ? "#f0fdf4" : "#fafafa", transition: "all 0.2s" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{data.parsedLeads.length > 0 ? "✅" : "⬆️"}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: data.parsedLeads.length > 0 ? "#059669" : "#334155" }}>
                    {data.parsedLeads.length > 0 ? `${data.parsedLeads.length} leads from "${data.leadsFileName}"` : "Click to upload CSV"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 3 }}>name, phone, email columns</div>
                </div>
                {data.parsedLeads.length > 0 && (
                  <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 9, maxHeight: 160, overflowY: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
                      <span>Name</span><span>Phone</span><span>Email</span>
                    </div>
                    {data.parsedLeads.slice(0, 10).map((lead, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "5px 10px", borderBottom: "1px solid #f1f5f9", fontSize: "0.72rem", color: "#334155" }}>
                        <span>{lead.name}</span><span style={{ fontFamily: "monospace" }}>{lead.phone}</span><span>{lead.email || "—"}</span>
                      </div>
                    ))}
                    {data.parsedLeads.length > 10 && (
                      <div style={{ padding: "6px 10px", fontSize: "0.68rem", color: "#94a3b8", textAlign: "center" }}>… and {data.parsedLeads.length - 10} more</div>
                    )}
                  </div>
                )}
                <button onClick={() => next()} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}>Skip — add leads later →</button>
              </div>
            )}

            {/* Step 6: Strategy */}
            {stepId === "strategy" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Calling strategy</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 1rem" }}>How should your agent dial and follow up?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {STRATEGIES.map(s => {
                    const sel = data.strategy === s.id;
                    return (
                      <div key={s.id} onClick={() => upd({ strategy: s.id })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 10, cursor: "pointer", border: sel ? "2px solid #2563eb" : "1.5px solid #e2e8f0", background: sel ? "#eff6ff" : "#fff", transition: "all 0.18s" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: sel ? "#dbeafe" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{s.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: sel ? "#2563eb" : "#0f172a" }}>{s.label}</div>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{s.desc}</div>
                        </div>
                        {sel && <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "#fff", fontWeight: 800 }}>✓</div>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <div>
                      <label style={lbl}>Campaign Timezone</label>
                      <select style={{ ...inp, cursor: "pointer" }} value={data.callingWindowTimezone} onChange={e => upd({ callingWindowTimezone: e.target.value })}>
                        <option value="lead_local">Use Lead's Local Time (Detected via Area Code)</option>
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="America/New_York">Eastern Time (US & Canada)</option>
                        <option value="America/Chicago">Central Time (US & Canada)</option>
                        <option value="America/Denver">Mountain Time (US & Canada)</option>
                        <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                        <option value="Europe/London">UK Time (London)</option>
                        <option value="Europe/Paris">Central Europe (Paris/Berlin)</option>
                        <option value="Asia/Kolkata">India Standard Time (IST)</option>
                        <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                        <option value="Australia/Sydney">Australian Eastern (AEST)</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><label style={lbl}>Start Time</label><input type="time" style={inp} value={data.callingWindowStart} onChange={e => upd({ callingWindowStart: e.target.value })} /></div>
                      <div><label style={lbl}>End Time</label><input type="time" style={inp} value={data.callingWindowEnd} onChange={e => upd({ callingWindowEnd: e.target.value })} /></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a" }}>⚡ Speed-to-Lead</span>
                    <input type="checkbox" checked={data.speedToLead} onChange={e => upd({ speedToLead: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a" }}>💬 SMS Follow-ups</span>
                    <input type="checkbox" checked={data.smsEnabled} onChange={e => upd({ smsEnabled: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Review & Launch */}
            {stepId === "review" && (
              <div style={{ animation: "fadeSlideIn 0.25s ease", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", margin: 0 }}>Review & Launch</h3>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>Everything looks good? Hit Launch to create your campaign.</p>

                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {[
                    { label: "Campaign", value: data.name, ok: true },
                    { label: "Agent", value: data.useExistingAgent ? (existingAgents.find(a => a.id === data.existingAgentId)?.name || "—") : data.agentName, ok: (data.useExistingAgent ? !!data.existingAgentId : data.agentName.length > 0) },
                    { label: "Phone", value: data.selectedPhone || "Skip (assign later)", ok: true },
                    { label: "Leads", value: data.parsedLeads.length > 0 ? `${data.parsedLeads.length} contacts` : "None yet", ok: true },
                    { label: "Strategy", value: STRATEGIES.find(s => s.id === data.strategy)?.label || "—", ok: true },
                    { label: "Calling Window", value: `${data.callingWindowStart} – ${data.callingWindowEnd} (${data.callingWindowTimezone === "lead_local" ? "Lead's Local Time" : data.callingWindowTimezone})`, ok: true },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{row.label}</span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: row.ok ? "#0f172a" : "#ef4444" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {launchProgress && (
                  <div style={{ background: launchProgress.includes("✅") ? "#ecfdf5" : "#eff6ff", border: `1px solid ${launchProgress.includes("✅") ? "#bbf7d0" : "#bfdbfe"}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.78rem", color: launchProgress.includes("✅") ? "#059669" : "#2563eb", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    {!launchProgress.includes("✅") && <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(37,99,235,0.3)", borderTopColor: "#2563eb", animation: "spin 0.7s linear infinite" }} />}
                    {launchProgress}
                  </div>
                )}

                {launchError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", fontSize: "0.78rem", color: "#ef4444", fontWeight: 600 }}>
                    ⚠️ {launchError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM navigation ── */}
        <div style={{ gridColumn: "2 / 4", borderTop: "1.5px solid #e2e8f0", padding: "0.85rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} disabled={launching} style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 18px", fontSize: "0.82rem", fontWeight: 700, color: "#64748b", cursor: "pointer", opacity: launching ? 0.5 : 1 }}>
            ← {step === 0 ? "Cancel" : "Back"}
          </button>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>{step + 1} / {WIZARD_STEPS.length}</div>
          <button onClick={next} disabled={!canContinue() || launching} style={{ background: canContinue() && !launching ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#e2e8f0", color: canContinue() && !launching ? "#fff" : "#94a3b8", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: "0.85rem", fontWeight: 800, cursor: canContinue() && !launching ? "pointer" : "not-allowed", boxShadow: canContinue() && !launching ? "0 4px 12px rgba(37,99,235,0.3)" : "none", transition: "all 0.2s" }}>
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
