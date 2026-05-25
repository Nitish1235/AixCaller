"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/* ─── STEP DEFINITIONS ────────────────────────────────────────── */
const STEPS = [
  { id: "setup",        label: "Setup",       icon: "⚙️" },
  { id: "channels",     label: "Channels",    icon: "📡" },
  { id: "channel_setup",label: "Channel Setup", icon: "📞" },
  { id: "agent",        label: "Agent",       icon: "🤖" },
  { id: "agent_setup",  label: "Agent Setup", icon: "✨" },
  { id: "apps",         label: "Apps",        icon: "🔌" },
  { id: "list",         label: "List",        icon: "📋" },
  { id: "strategy",     label: "Strategy",    icon: "🎯" },
];

const TOTAL_STEPS = STEPS.length;

const CHANNELS = [
  { id: "voice",    label: "Voice",    desc: "Phone calls",         icon: "📞", color: "#7c3aed" },
  { id: "sms",      label: "SMS",      desc: "Text messages",        icon: "💬", color: "#0ea5e9" },
  { id: "whatsapp", label: "WhatsApp", desc: "Business messaging",   icon: "📱", color: "#16a34a" },
];

const MOCK_NUMBERS = [
  "+19145608350", "+17328386959", "+18145189832", "+19787554926",
];

const APPS = [
  { id: "google_cal", label: "Google Calendar", icon: "📅", color: "#4285F4" },
  { id: "calendly",   label: "Calendly",        icon: "🗓️", color: "#006BFF" },
  { id: "cal_com",    label: "Cal.com",          icon: "📆", color: "#111827" },
  { id: "hubspot",    label: "HubSpot",          icon: "🟠", color: "#FF7A59" },
  { id: "zoho",       label: "Zoho CRM",         icon: "💼", color: "#7c3aed" },
  { id: "gsheets",    label: "Google Sheets",    icon: "📊", color: "#34A853" },
];

const STRATEGIES = [
  { id: "immediate",  label: "Immediate Dial",       desc: "Call leads as soon as they're added", icon: "⚡" },
  { id: "scheduled",  label: "Scheduled Campaign",   desc: "Set specific calling windows & days",  icon: "📅" },
  { id: "drip",       label: "Multi-Touch Drip",     desc: "Call + SMS follow-up cadence",         icon: "🌊" },
  { id: "reactivation",label: "Lead Reactivation",   desc: "Re-engage cold or stale leads",        icon: "🔥" },
];

/* ─── SMALL COMPONENTS ────────────────────────────────────────── */
function ChatBubble({ text, align = "right" }: { text: string; align?: "left" | "right" }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: align === "right" ? "flex-end" : "flex-start",
      marginBottom: 10,
      animation: "fadeSlideIn 0.3s ease",
    }}>
      {align === "left" && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", maxWidth: "85%" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0, marginTop: 2 }}>✦</div>
          <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "0 14px 14px 14px", padding: "10px 14px", fontSize: "0.82rem", color: "#334155", lineHeight: 1.5, fontWeight: 600 }}>
            {text}
          </div>
        </div>
      )}
      {align === "right" && (
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "9px 16px", fontSize: "0.82rem", fontWeight: 600, maxWidth: "75%", lineHeight: 1.4 }}>
          {text}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
      </div>
      <div>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155", lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

/* ─── MAIN BUILDER ────────────────────────────────────────────── */
export default function SystemBuilderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [systemName, setSystemName] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [agentName, setAgentName] = useState("");
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [leadsFile, setLeadsFile] = useState<string | null>(null);

  const progress = Math.round(((currentStep) / TOTAL_STEPS) * 100);
  const stepId = STEPS[currentStep]?.id;

  const canContinue = (): boolean => {
    if (stepId === "setup") return systemName.trim().length > 0;
    if (stepId === "channels") return selectedChannels.length > 0;
    if (stepId === "channel_setup") return selectedNumber.length > 0;
    if (stepId === "agent") return agentName.trim().length > 0;
    return true;
  };

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS - 1) setCurrentStep(s => s + 1);
    else {
      // Final step → redirect to campaigns with success
      router.push("/dashboard/campaigns?created=1");
    }
  };

  const toggleChannel = (id: string) => {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleApp = (id: string) => {
    setConnectedApps(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .builder-number-row:hover { background: #eff6ff !important; border-color: #2563eb !important; }
        .builder-channel-card:hover { border-color: #2563eb !important; }
        .builder-app-card:hover { border-color: #2563eb !important; transform: translateY(-1px); }
        .builder-strategy-card:hover { border-color: #2563eb !important; background: #eff6ff !important; }
      `}</style>

      <div style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 380px",
        height: "calc(100vh - 64px)",
        background: "#f8fafc",
        gap: 0,
        overflow: "hidden",
      }}>

        {/* ─── LEFT SIDEBAR: Progress ──────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderRight: "1.5px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 1.25rem",
          overflowY: "auto",
        }}>
          {/* Back button */}
          <button
            onClick={() => router.push("/dashboard/campaigns")}
            style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", cursor: "pointer", marginBottom: "1.5rem", textAlign: "left" }}
          >
            ← Back to Setups
          </button>

          {/* Progress header */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8" }}>System Progress</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#2563eb" }}>{progress}%</span>
            </div>
            <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(to right, #2563eb, #3b82f6)", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>

          {/* Step list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={step.id}
                  onClick={() => i <= currentStep && setCurrentStep(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 10px",
                    borderRadius: 9,
                    cursor: i <= currentStep ? "pointer" : "default",
                    background: active ? "#eff6ff" : "transparent",
                    border: active ? "1.5px solid rgba(37,99,235,0.15)" : "1.5px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Dot */}
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "#059669" : active ? "#2563eb" : "#e2e8f0",
                    border: "none",
                    fontSize: "0.65rem", fontWeight: 800, color: done || active ? "#fff" : "#94a3b8",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: active ? "#2563eb" : done ? "#059669" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {step.label}
                    </div>
                    {/* Sub-label when done */}
                    {done && step.id === "setup" && systemName && (
                      <div style={{ fontSize: "0.65rem", color: "#059669", fontWeight: 600, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {systemName}
                      </div>
                    )}
                    {done && step.id === "channels" && selectedChannels.length > 0 && (
                      <div style={{ fontSize: "0.65rem", color: "#059669", fontWeight: 600, marginTop: 1 }}>
                        {selectedChannels.join(", ")}
                      </div>
                    )}
                    {done && step.id === "agent" && agentName && (
                      <div style={{ fontSize: "0.65rem", color: "#059669", fontWeight: 600, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {agentName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CENTER: Conversation Log ─────────────────────────────── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          padding: "2rem 2rem 1rem",
          overflowY: "auto",
          background: "#f8fafc",
        }}>
          {/* Step counter */}
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: "1.5rem" }}>
            Step {currentStep + 1} of {TOTAL_STEPS}
          </div>

          {/* Conversation transcript */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

            {/* Always show: system prompt */}
            <SectionHeader label="System" text="PERFECT! YOU'VE SELECTED YOUR CAMPAIGN TYPE. LET'S SET UP YOUR SYSTEM." />
            <SectionHeader label="System Name" text="Enter a clear name for your setup on the right, then press Continue." />
            {systemName && <ChatBubble text={`System name: "${systemName}"`} />}

            {currentStep >= 1 && (
              <>
                <SectionHeader label="Channels" text="GREAT! NOW LET'S SET UP YOUR AGENT." />
                <SectionHeader label="Choose Channels" text="Tip: Voice for calls; SMS or WhatsApp for texts. Press Continue when ready." />
                {selectedChannels.length > 0 && (
                  <ChatBubble text={`Selected: ${selectedChannels.join(", ")}`} />
                )}
              </>
            )}

            {currentStep >= 2 && (
              <>
                <SectionHeader label="Set Up Channels" text="Use Existing to pick a number/account. Or Import/Connect a new one. We will continue automatically once the required items are set." />
                {selectedNumber && <ChatBubble text={`Phone number: ${selectedNumber}`} />}
              </>
            )}

            {currentStep >= 3 && (
              <>
                <SectionHeader label="Agent" text="PERFECT! LET'S NAME YOUR AI AGENT." />
                {agentName && <ChatBubble text={`Agent name: "${agentName}"`} />}
              </>
            )}

            {currentStep >= 4 && (
              <SectionHeader label="Agent Setup" text="PERFECT! LET ME CONFIGURE YOUR AGENT WITH ALL THIS INFORMATION..." />
            )}

            {currentStep >= 5 && (
              <>
                <SectionHeader label="Connect Apps" text="From Connected apps: click items to add them. Connect the most common calendars or CRM tools to complete them. Click Continue when your apps are selected." />
                {connectedApps.length > 0 && <ChatBubble text={`Connected: ${connectedApps.join(", ")}`} />}
              </>
            )}

            {currentStep >= 6 && (
              <SectionHeader label="Lead List" text="Upload a CSV of leads to dial, or connect your CRM to sync contacts automatically." />
            )}

            {currentStep >= 7 && (
              <SectionHeader label="Strategy" text="Choose how your campaign should dial and follow up with leads." />
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Active Form ─────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderLeft: "1.5px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}>
          <div style={{ padding: "1.75rem", flex: 1 }}>

            {/* STEP 0: System Name */}
            {stepId === "setup" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 1 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a", margin: "0 0 0.4rem" }}>Name your system</h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1.5rem", lineHeight: 1.5 }}>Give your campaign setup a descriptive name. This will be used to auto-name all entities in your system.</p>
                <input
                  autoFocus
                  type="text"
                  value={systemName}
                  onChange={e => setSystemName(e.target.value)}
                  placeholder="e.g. Black Friday Campaign"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 9,
                    border: "1.5px solid #e2e8f0", fontSize: "0.9rem",
                    outline: "none", fontFamily: "inherit", color: "#0f172a",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  onKeyDown={e => e.key === "Enter" && canContinue() && handleContinue()}
                />
              </div>
            )}

            {/* STEP 1: Channels */}
            {stepId === "channels" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 2 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Select your channels</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>Choose how your AI agent will reach leads.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {CHANNELS.map(ch => {
                    const selected = selectedChannels.includes(ch.id);
                    return (
                      <div
                        key={ch.id}
                        className="builder-channel-card"
                        onClick={() => toggleChannel(ch.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                          border: selected ? `2px solid ${ch.color}` : "1.5px solid #e2e8f0",
                          background: selected ? `${ch.color}08` : "#fff",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${ch.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                          {ch.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{ch.label}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{ch.desc}</div>
                        </div>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          border: selected ? `none` : "2px solid #cbd5e1",
                          background: selected ? ch.color : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.6rem", color: "#fff", fontWeight: 800, flexShrink: 0,
                        }}>
                          {selected ? "✓" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedChannels.length > 0 && (
                  <div style={{ marginTop: "1rem", padding: "8px 12px", background: "#eff6ff", borderRadius: 8, fontSize: "0.78rem", color: "#2563eb", fontWeight: 700 }}>
                    {selectedChannels.length} channel{selectedChannels.length > 1 ? "s" : ""} selected
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Channel Setup (Phone Number) */}
            {stepId === "channel_setup" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 3 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Set up your channels</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>Import phone numbers and connect messaging accounts.</p>

                {/* Phone Number Card */}
                <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1.5px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>📞</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>Phone Number</div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Required for voice calls and SMS messages</div>
                      </div>
                    </div>
                    <button style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>Tutorial</button>
                  </div>

                  {/* Use Existing / Import New */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1.5px solid #e2e8f0" }}>
                    <button style={{ padding: "10px", fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", background: "#f8fafc", border: "none", borderRight: "1.5px solid #e2e8f0", cursor: "pointer" }}>Use Existing</button>
                    <button style={{ padding: "10px", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", background: "#fff", border: "none", cursor: "pointer" }}>Import New</button>
                  </div>

                  {/* Number list */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {MOCK_NUMBERS.map(num => (
                      <div
                        key={num}
                        className="builder-number-row"
                        onClick={() => setSelectedNumber(num)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "11px 14px", cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          background: selectedNumber === num ? "#eff6ff" : "#fff",
                          border: selectedNumber === num ? "1.5px solid #2563eb" : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", flexShrink: 0 }}>📞</div>
                        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>{num}</span>
                        {selectedNumber === num && (
                          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#2563eb", fontWeight: 800 }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.78rem", cursor: "pointer", marginTop: 10, textDecoration: "underline" }}>
                  Skip channel setup →
                </button>
              </div>
            )}

            {/* STEP 3: Agent Name */}
            {stepId === "agent" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 4 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Name your AI agent</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>This is the name your agent will introduce itself as on calls.</p>
                <input
                  autoFocus
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="e.g. Sam"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", color: "#0f172a", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  onKeyDown={e => e.key === "Enter" && canContinue() && handleContinue()}
                />
                <div style={{ marginTop: "1.25rem", background: "#eff6ff", borderRadius: 10, padding: "12px 14px", fontSize: "0.78rem", color: "#2563eb", lineHeight: 1.6, fontWeight: 500 }}>
                  💡 A first name works best. It makes the AI sound natural and conversational on calls.
                </div>
              </div>
            )}

            {/* STEP 4: Agent Setup (Auto-configure prompt) */}
            {stepId === "agent_setup" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 5 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Tell us about your business</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>We'll automatically configure {agentName || "your agent"}'s prompt based on this.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Business Website (optional)</label>
                    <input
                      type="url"
                      placeholder="https://yourbusiness.com"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#2563eb"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Additional Context (optional)</label>
                    <textarea
                      rows={4}
                      placeholder="Describe what your business does, who you're calling, and what the goal of the call is..."
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#2563eb"}
                      onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", fontSize: "0.78rem", color: "#059669", fontWeight: 600, lineHeight: 1.5 }}>
                    ✨ Agent &quot;{agentName || "Sam"}&quot; will be automatically configured with an AI-generated prompt based on your details.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Apps */}
            {stepId === "apps" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 6 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Connect apps</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>Integrate your AI agent with calendars and CRMs with one click.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Common Calendars</div>
                  {APPS.slice(0, 3).map(app => (
                    <div key={app.id} className="builder-app-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#fff", transition: "all 0.2s" }}>
                      <span style={{ fontSize: "1.1rem" }}>{app.icon}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>{app.label}</span>
                      <button
                        onClick={() => toggleApp(app.id)}
                        style={{
                          padding: "5px 14px", borderRadius: 7, fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", border: "1.5px solid",
                          borderColor: connectedApps.includes(app.id) ? "#059669" : "#e2e8f0",
                          background: connectedApps.includes(app.id) ? "#f0fdf4" : "#fff",
                          color: connectedApps.includes(app.id) ? "#059669" : "#64748b",
                          transition: "all 0.2s",
                        }}
                      >
                        {connectedApps.includes(app.id) ? "✓ CONNECTED" : "CONNECT"}
                      </button>
                    </div>
                  ))}

                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, margin: "8px 0 2px" }}>CRM Systems</div>
                  {APPS.slice(3).map(app => (
                    <div key={app.id} className="builder-app-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#fff", transition: "all 0.2s" }}>
                      <span style={{ fontSize: "1.1rem" }}>{app.icon}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>{app.label}</span>
                      <button
                        onClick={() => toggleApp(app.id)}
                        style={{
                          padding: "5px 14px", borderRadius: 7, fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", border: "1.5px solid",
                          borderColor: connectedApps.includes(app.id) ? "#059669" : "#e2e8f0",
                          background: connectedApps.includes(app.id) ? "#f0fdf4" : "#fff",
                          color: connectedApps.includes(app.id) ? "#059669" : "#64748b",
                          transition: "all 0.2s",
                        }}
                      >
                        {connectedApps.includes(app.id) ? "✓ CONNECTED" : "CONNECT"}
                      </button>
                    </div>
                  ))}
                </div>

                <button style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.78rem", cursor: "pointer", marginTop: 14, textDecoration: "underline" }}>
                  Skip connecting apps →
                </button>
              </div>
            )}

            {/* STEP 6: Lead List */}
            {stepId === "list" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 7 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Import your lead list</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>Upload a CSV or connect a CRM to pull contacts automatically.</p>

                {/* CSV Upload */}
                <div
                  onClick={() => setLeadsFile("leads_import.csv")}
                  style={{
                    border: `2px dashed ${leadsFile ? "#059669" : "#cbd5e1"}`,
                    borderRadius: 12, padding: "2rem", textAlign: "center",
                    cursor: "pointer", background: leadsFile ? "#f0fdf4" : "#fafafa",
                    transition: "all 0.2s", marginBottom: "1rem",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>{leadsFile ? "✅" : "⬆️"}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: leadsFile ? "#059669" : "#334155" }}>
                    {leadsFile ? `"${leadsFile}" — Ready to import` : "Click to upload a CSV file"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                    {leadsFile ? "Click to change file" : "Columns: name, phone, email (optional)"}
                  </div>
                </div>

                <div style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "1rem" }}>— or connect a source —</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                  {[{ icon: "🟠", label: "HubSpot" }, { icon: "💼", label: "Zoho CRM" }, { icon: "📊", label: "Google Sheets" }, { icon: "⚙️", label: "Custom API" }].map(s => (
                    <div key={s.label} className="builder-app-card" style={{ padding: "10px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#fff", transition: "all 0.2s" }}>
                      <span style={{ fontSize: "1rem" }}>{s.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#334155" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: Strategy */}
            {stepId === "strategy" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Step 8 of {TOTAL_STEPS}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.3rem" }}>Choose your strategy</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1.25rem" }}>How should your AI agent dial and follow up with leads?</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {STRATEGIES.map(s => (
                    <div
                      key={s.id}
                      className="builder-strategy-card"
                      onClick={() => setSelectedStrategy(s.id)}
                      style={{
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        border: selectedStrategy === s.id ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                        background: selectedStrategy === s.id ? "#eff6ff" : "#fff",
                        transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: selectedStrategy === s.id ? "#dbeafe" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                        {s.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: selectedStrategy === s.id ? "#2563eb" : "#0f172a" }}>{s.label}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{s.desc}</div>
                      </div>
                      {selectedStrategy === s.id && (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff", fontWeight: 800, flexShrink: 0 }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ── Bottom Navigation ── */}
          <div style={{
            padding: "1rem 1.75rem",
            borderTop: "1.5px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fff",
          }}>
            <button
              onClick={() => currentStep > 0 ? setCurrentStep(s => s - 1) : router.push("/dashboard/campaigns")}
              style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 18px", fontSize: "0.82rem", fontWeight: 700, color: "#64748b", cursor: "pointer" }}
            >
              ← Back
            </button>

            <button
              onClick={handleContinue}
              disabled={!canContinue()}
              style={{
                background: canContinue() ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#e2e8f0",
                color: canContinue() ? "#fff" : "#94a3b8",
                border: "none", borderRadius: 9, padding: "10px 24px",
                fontSize: "0.85rem", fontWeight: 800, cursor: canContinue() ? "pointer" : "not-allowed",
                boxShadow: canContinue() ? "0 4px 14px rgba(37,99,235,0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              {currentStep === TOTAL_STEPS - 1 ? "🚀 Launch Campaign" : "Continue →"}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
