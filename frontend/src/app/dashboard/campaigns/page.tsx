"use client";
import { useState } from "react";
import Link from "next/link";

/* ─── TYPES ──────────────────────────────────────────────────── */
interface Stage {
  id: string;
  stageLabel: string;
  nodes: CampaignNode[];
}
interface CampaignNode {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  bgColor: string;
  actionLabel?: string;
  actionHref?: string;
}

/* ─── MOCK CAMPAIGN DATA ─────────────────────────────────────── */
const MOCK_CAMPAIGNS = [
  {
    id: "camp_1",
    name: "Lead Reactivation",
    createdAt: "2 hours ago",
    status: "ready",
    stages: [
      {
        id: "s1", stageLabel: "1. FEEDING CONTACT DATA",
        nodes: [
          { id: "list", label: "Lead Reactivation", sublabel: "Strategy: str_Zj72g5ck", icon: "📋", color: "#2563eb", bgColor: "#eff6ff", actionLabel: "Configure", actionHref: "#" },
        ],
      },
      {
        id: "s2", stageLabel: "2. AGENT",
        nodes: [
          { id: "agent", label: "SAM", sublabel: "agt_UL0S800k42w", icon: "🤖", color: "#059669", bgColor: "#ecfdf5", actionLabel: "Configure", actionHref: "#" },
        ],
      },
      {
        id: "s3", stageLabel: "3. MONITOR RESULTS",
        nodes: [
          { id: "analytics", label: "Analytics", sublabel: "Performance dashboard", icon: "📊", color: "#7c3aed", bgColor: "#f5f3ff", actionLabel: "View Objectives", actionHref: "/dashboard/calls" },
        ],
      },
    ] as Stage[],
  },
];

/* ─── CONNECTOR ──────────────────────────────────────────────── */
function PipeArrow({ color = "#2563eb" }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: 56, flexShrink: 0 }}>
      <svg width="56" height="16" style={{ overflow: "visible" }}>
        <line x1="0" y1="8" x2="48" y2="8" stroke={color} strokeWidth="2" strokeDasharray="5 3" />
        <polygon points="56,8 44,4 44,12" fill={color} />
      </svg>
    </div>
  );
}

/* ─── CAMPAIGN PIPELINE NODE ─────────────────────────────────── */
function CampaignPipeNode({ node, selected, onClick }: {
  node: CampaignNode; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? node.bgColor : "#fff",
        border: selected ? `2px solid ${node.color}` : "1.5px solid #e2e8f0",
        borderRadius: 14,
        padding: "1rem 1.25rem",
        minWidth: 200,
        maxWidth: 240,
        cursor: "pointer",
        boxShadow: selected ? `0 6px 24px ${node.color}20` : "0 2px 10px rgba(0,0,0,0.04)",
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: node.bgColor, border: `1.5px solid ${node.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
          {node.icon}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669", boxShadow: "0 0 0 3px #ecfdf5", marginTop: 4 }} />
      </div>
      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 3 }}>{node.label}</div>
      <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "monospace", marginBottom: 10 }}>{node.sublabel}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {node.actionLabel && (
          <Link href={node.actionHref || "#"} style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6,
              border: "1.5px solid #e2e8f0", color: "#64748b", background: "#fff", cursor: "pointer",
            }}>{node.actionLabel}</span>
          </Link>
        )}
        {node.id === "agent" && (
          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${node.color}30`, color: node.color, background: node.bgColor, cursor: "pointer" }}>
            View Objective ✓
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export default function CampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<typeof MOCK_CAMPAIGNS[0] | null>(MOCK_CAMPAIGNS[0]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [showEmpty] = useState(false); // set true if no real campaigns exist

  const handleExecute = () => {
    setLaunching(true);
    setTimeout(() => setLaunching(false), 2500);
  };

  if (showEmpty) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", margin: 0 }}>Outbound Campaigns</h1>
            <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "0.85rem" }}>AI-powered outbound call campaigns.</p>
          </div>
          <Link href="/dashboard/campaigns/builder"><button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>+ Create System</button></Link>
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "5rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📣</div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", margin: "0 0 0.5rem" }}>No Campaigns Yet</h2>
          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "0 0 1.5rem" }}>Create your first outbound campaign to start dialing leads.</p>
          <Link href="/dashboard/campaigns/builder"><button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>+ Create Your First Campaign</button></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulseDot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeInRight { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        .pipe-campaign-node:hover { transform:translateY(-2px); }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "calc(100vh - 64px - 4.5rem)", minHeight: 0 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>Outbound Campaigns</h1>
            <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "0.85rem" }}>AI-powered outbound call pipeline. Click any node to configure.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 14px" }}>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>🔍</span>
              <input placeholder="Search campaigns…" style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.82rem", width: 140, color: "#0f172a" }} />
            </div>
            <Link href="/dashboard/campaigns/builder" style={{ textDecoration: "none" }}>
              <button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
                + Create System
              </button>
            </Link>
          </div>
        </div>

        {/* ── Two column: left sidebar + right pipeline ── */}
        <div style={{ display: "flex", gap: "1.25rem", flex: 1, minHeight: 0 }}>

          {/* Campaign List sidebar */}
          <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.6rem", overflowY: "auto" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, padding: "0 4px" }}>My Campaigns</div>
            {MOCK_CAMPAIGNS.map(c => (
              <div
                key={c.id}
                onClick={() => { setSelectedCampaign(c); setSelectedNode(null); }}
                style={{
                  background: selectedCampaign?.id === c.id ? "#eff6ff" : "#fff",
                  border: selectedCampaign?.id === c.id ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  borderRadius: 12, padding: "12px 14px", cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", marginBottom: 4 }}>{c.name}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                  <span style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 700 }}>Ready</span>
                  <span style={{ fontSize: "0.65rem", color: "#94a3b8", marginLeft: "auto" }}>{c.createdAt}</span>
                </div>
              </div>
            ))}

            {/* Add new */}
            <Link href="/dashboard/campaigns/builder" style={{ textDecoration: "none" }}>
              <div style={{ border: "1.5px dashed #e2e8f0", borderRadius: 12, padding: "12px", cursor: "pointer", textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, transition: "all 0.2s" }}>
                + New Campaign
              </div>
            </Link>
          </div>

          {/* Pipeline canvas */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>

            {selectedCampaign && (
              <>
                {/* Campaign name bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>📣</div>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{selectedCampaign.name}</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 99, padding: "2px 8px" }}>● Ready</span>
                  <span style={{ fontSize: "0.68rem", color: "#94a3b8", marginLeft: "auto" }}>Created {selectedCampaign.createdAt}</span>
                </div>

                {/* Pipeline canvas */}
                <div style={{
                  flex: 1, background: "#fff",
                  border: "1.5px solid #e2e8f0", borderRadius: 16,
                  padding: "2rem", position: "relative",
                  backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  overflowX: "auto", overflowY: "auto",
                }}>

                  {/* Stage labels row */}
                  <div style={{ display: "flex", gap: 0, marginBottom: "1.75rem" }}>
                    {selectedCampaign.stages.map((stage, i) => (
                      <div key={stage.id} style={{ width: i < selectedCampaign.stages.length - 1 ? 296 : 240, flexShrink: 0 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{stage.stageLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pipeline nodes row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    {selectedCampaign.stages.map((stage, si) => (
                      <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {stage.nodes.map(n => (
                            <CampaignPipeNode key={n.id} node={n} selected={selectedNode === n.id} onClick={() => setSelectedNode(selectedNode === n.id ? null : n.id)} />
                          ))}
                        </div>
                        {si < selectedCampaign.stages.length - 1 && (
                          <PipeArrow color={si === 0 ? "#2563eb" : "#f59e0b"} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bottom actions */}
                  <div style={{ position: "absolute", bottom: 20, right: 20, display: "flex", gap: 10 }}>
                    <button
                      style={{
                        background: "none", border: "2px solid #e2e8f0",
                        borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.85rem",
                        cursor: "pointer", color: "#334155", transition: "all 0.2s",
                      }}
                      onClick={() => window.alert("Test mode: calling 1 lead…")}
                    >
                      🧪 Test with 1 lead
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={launching}
                      style={{
                        background: launching ? "#059669" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "#fff", border: "none", borderRadius: 10,
                        padding: "10px 24px", fontWeight: 800, fontSize: "0.85rem",
                        cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                        transition: "all 0.3s", display: "flex", alignItems: "center", gap: 8,
                      }}
                    >
                      {launching
                        ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Running…</>
                        : "🚀 Execute Campaign"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right config drawer */}
          {selectedNode && selectedCampaign && (() => {
            const n = selectedCampaign.stages.flatMap(s => s.nodes).find(n => n.id === selectedNode);
            if (!n) return null;
            return (
              <div style={{
                width: 280, flexShrink: 0, background: "#fff",
                border: `2px solid ${n.color}30`, borderRadius: 16,
                boxShadow: `0 8px 32px ${n.color}10`,
                display: "flex", flexDirection: "column",
                animation: "fadeInRight 0.2s ease", overflow: "hidden",
              }}>
                <div style={{ padding: "1.25rem", background: n.bgColor, borderBottom: "1.5px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: "1.5rem" }}>{n.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>{n.label}</div>
                        <div style={{ fontSize: "0.68rem", color: n.color, fontWeight: 700, fontFamily: "monospace" }}>{n.sublabel}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: "1.25rem", flex: 1, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>
                  {n.id === "list" && "Your contact list feeds leads into this campaign. Configure the strategy and upload your CSV list in the builder."}
                  {n.id === "agent" && "Your AI agent handles all calls. Click 'Configure' to edit the agent's script, voice, and objectives."}
                  {n.id === "analytics" && "Track campaign performance: calls made, appointments booked, no-answers, and conversion rates."}
                  <div style={{ marginTop: "1rem" }}>
                    {n.actionHref && n.actionHref !== "#" && (
                      <Link href={n.actionHref} style={{ textDecoration: "none" }}>
                        <button style={{ width: "100%", background: n.color, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>
                          {n.actionLabel || "Open →"}
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
