"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAgents, apiGet, apiPut, apiPost, getTenantId } from "@/lib/api";

const containerStyle: React.CSSProperties = { display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", overflow: "hidden" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid var(--border)", background: "#fff" };
const mainLayout: React.CSSProperties = { display: "flex", flex: 1, overflow: "hidden", background: "#f9fafb" };
const timelinePane: React.CSSProperties = { flex: 1, overflowY: "auto", padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 };
const configPane: React.CSSProperties = { width: "420px", background: "#fff", borderLeft: "1px solid var(--border)", overflowY: "auto", display: "flex", flexDirection: "column" };

const btn = (c = "var(--blue)", extra?: React.CSSProperties): React.CSSProperties => ({
  background: c, color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px",
  fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", ...extra,
});
const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid var(--border)",
  fontSize: "0.9rem", outline: "none", fontFamily: "inherit"
};

const defaultFlow = {
  pre_call: { business_hours: "always" },
  during_call: { tools: { knowledge_base: { enabled: true }, human_transfer: { enabled: false } } },
  post_call: { email_summary: { enabled: true }, webhook_post: { enabled: false }, airtable_log: { enabled: false }, hubspot_sync: { enabled: false }, salesforce_sync: { enabled: false } }
};

export default function CallFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [agents, setAgents] = useState<any[]>([]);
  const [agentId, setAgentId] = useState<string>(searchParams.get("agent") || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [callFlow, setCallFlow] = useState<any>(JSON.parse(JSON.stringify(defaultFlow)));
  const [integrations, setIntegrations] = useState<any>({});
  
  const [selectedItem, setSelectedItem] = useState<string>("overview"); // overview, shopify, airtable, etc.
  
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const loadAgents = async () => {
      const tid = getTenantId();
      if (tid) {
        const list = await fetchAgents(tid);
        setAgents(list);
        if (!agentId && list.length > 0) {
          setAgentId(list[0].id);
        }
      }
    };
    loadAgents();
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    const loadFlow = async () => {
      setLoading(true);
      try {
        const res = await apiGet(`/agents/${agentId}/call-flow`);
        if (res.call_flow && Object.keys(res.call_flow).length > 0) {
          // Merge with defaults to ensure all keys exist
          setCallFlow({ ...defaultFlow, ...res.call_flow });
        } else {
          setCallFlow(JSON.parse(JSON.stringify(defaultFlow)));
        }
        setIntegrations(res.integrations || {});
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadFlow();
    // Clear selections on agent change
    setSelectedItem("overview");
    setTestResult(null);
  }, [agentId]);

  const saveFlow = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await apiPut(`/agents/${agentId}/call-flow`, { call_flow: callFlow });
      alert("Call flow saved successfully!");
    } catch (e) {
      alert("Failed to save call flow.");
      console.error(e);
    }
    setSaving(false);
  };

  const testConnection = async (integration: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiPost(`/agents/${agentId}/call-flow/test`, { integration });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Test failed" });
    }
    setTesting(false);
  };

  // Helper to deep update callFlow
  const updateFlow = (path: string[], value: any) => {
    setCallFlow((prev: any) => {
      const nw = { ...prev };
      let curr = nw;
      for (let i = 0; i < path.length - 1; i++) {
        if (!curr[path[i]]) curr[path[i]] = {};
        curr = curr[path[i]];
      }
      curr[path[path.length - 1]] = value;
      return nw;
    });
  };

  const isToolEnabled = (tool: string, phase: string = "during_call") => {
    if (phase === "during_call") {
      return callFlow.during_call?.tools?.[tool]?.enabled || false;
    } else if (phase === "post_call") {
      return callFlow.post_call?.[tool]?.enabled || false;
    }
    return false;
  };

  const toggleTool = (tool: string, phase: string = "during_call") => {
    const current = isToolEnabled(tool, phase);
    if (phase === "during_call") {
      updateFlow(["during_call", "tools", tool, "enabled"], !current);
    } else {
      updateFlow(["post_call", tool, "enabled"], !current);
    }
  };

  const renderTimelineCard = (title: string, subtitle: string, items: {id: string, label: string, icon: string, phase: string}[]) => (
    <div style={{ width: 600, background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 4px", color: "var(--text)" }}>{title}</h2>
      <p style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: "0.9rem" }}>{subtitle}</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map(item => {
          const enabled = isToolEnabled(item.id, item.phase);
          const selected = selectedItem === item.id;
          return (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: 16, border: selected ? "2px solid var(--blue)" : "1.5px solid var(--border)", borderRadius: 12,
                cursor: "pointer", background: selected ? "rgba(29, 78, 216, 0.04)" : "#fff",
                transition: "all 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem", filter: enabled ? "none" : "grayscale(100%) opacity(50%)" }}>{item.icon}</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: enabled ? "var(--text)" : "var(--text-muted)" }}>{item.label}</span>
              </div>
              
              <div onClick={(e) => { e.stopPropagation(); toggleTool(item.id, item.phase); }} style={{
                width: 40, height: 22, borderRadius: 11, background: enabled ? "var(--blue)" : "#e2e8f0",
                position: "relative", cursor: "pointer", transition: "0.2s"
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2, left: enabled ? 20 : 2, transition: "0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGuide = () => {
    switch(selectedItem) {
      case "shopify":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Shopify Setup</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Allow your AI agent to look up order status and product information in real-time.
            </p>
            {integrations.shopify_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ Connected to {integrations.shopify_domain}
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                Not connected. Go to the Integrations page to link your Shopify store.
              </div>
            )}
            <button 
              onClick={() => testConnection("shopify")} 
              disabled={testing || !integrations.shopify_connected}
              style={{ ...btn("#f1f5f9"), color: "#334155", width: "100%", border: "1px solid #cbd5e1" }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {testResult && (
              <div style={{ marginTop: 15, padding: 10, borderRadius: 8, fontSize: "0.85rem", background: testResult.success ? "#dcfce7" : "#fee2e2", color: testResult.success ? "#166534" : "#991b1b" }}>
                {testResult.message}
              </div>
            )}
          </div>
        );
      case "airtable":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Airtable Log</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Automatically log every completed call, transcript, and summary to an Airtable base.
            </p>
            {integrations.airtable_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ Airtable Connected
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                Not connected. Go to the Integrations page to set your Personal Access Token.
              </div>
            )}
            <button 
              onClick={() => testConnection("airtable")} 
              disabled={testing || !integrations.airtable_connected}
              style={{ ...btn("#f1f5f9"), color: "#334155", width: "100%", border: "1px solid #cbd5e1" }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {testResult && (
              <div style={{ marginTop: 15, padding: 10, borderRadius: 8, fontSize: "0.85rem", background: testResult.success ? "#dcfce7" : "#fee2e2", color: testResult.success ? "#166534" : "#991b1b" }}>
                {testResult.message}
              </div>
            )}
          </div>
        );
      case "webhook_post":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Post-call Webhook</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Send a POST request to a Zapier, Make, or custom URL after every call ends.
            </p>
            {integrations.webhook_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ Webhook URL is set
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                Not connected. Set your Webhook URL in the Integrations page.
              </div>
            )}
            <button 
              onClick={() => testConnection("webhook")} 
              disabled={testing || !integrations.webhook_connected}
              style={{ ...btn("#f1f5f9"), color: "#334155", width: "100%", border: "1px solid #cbd5e1" }}
            >
              {testing ? "Testing..." : "Send Test Webhook"}
            </button>
            {testResult && (
              <div style={{ marginTop: 15, padding: 10, borderRadius: 8, fontSize: "0.85rem", background: testResult.success ? "#dcfce7" : "#fee2e2", color: testResult.success ? "#166534" : "#991b1b" }}>
                {testResult.message}
              </div>
            )}
          </div>
        );
      case "hubspot_sync":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>HubSpot Sync</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Log calls automatically to HubSpot Contacts.
            </p>
            {integrations.hubspot_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ HubSpot Connected
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                Not connected. Link HubSpot in the Integrations page.
              </div>
            )}
          </div>
        );
      case "salesforce_sync":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Salesforce Sync</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Log calls automatically to Salesforce Leads/Contacts.
            </p>
            {integrations.salesforce_connected ? (
              <div style={{ padding: 15, background: "#dcfce7", color: "#166534", borderRadius: 8, fontWeight: 600, fontSize: "0.9rem", marginBottom: 20 }}>
                ✓ Salesforce Connected
              </div>
            ) : (
              <div style={{ padding: 15, background: "#fef3c7", color: "#92400e", borderRadius: 8, fontSize: "0.9rem", marginBottom: 20 }}>
                Not connected. Link Salesforce in the Integrations page.
              </div>
            )}
          </div>
        );
      case "human_transfer":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Human Transfer</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Allow the AI to transfer the call to a real human if requested or if sentiment drops.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Note: You must set your Forwarding Number in the Agent Settings page.
            </p>
          </div>
        );
      case "knowledge_base":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Knowledge Base</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Allow the AI to search your uploaded documents during a call.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Manage documents in the Agent Knowledge Base tab.
            </p>
          </div>
        );
      case "email_summary":
        return (
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 10px" }}>Email Summary</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Receive an email summary with transcript and action items after every call.
            </p>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: 15 }}>🔀</span>
            <h3>Select a tool</h3>
            <p style={{ fontSize: "0.9rem" }}>Click any tool in the timeline to configure it.</p>
          </div>
        );
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "var(--text)" }}>Call Flow Builder</h1>
          {agents.length > 0 && (
            <select style={{ ...inp, width: 250, padding: "8px 12px" }} value={agentId} onChange={e => setAgentId(e.target.value)}>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push(`/dashboard/agents/${agentId}`)} style={btn("var(--bg)", { color: "var(--text)", border: "1.5px solid var(--border)" })}>
            Back to Agent
          </button>
          <button onClick={saveFlow} disabled={saving || !agentId} style={btn()}>
            {saving ? "Saving..." : "Deploy Flow"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>Loading flow...</div>
      ) : (
        <div style={mainLayout}>
          {/* Timeline Panel */}
          <div style={timelinePane}>
            
            {/* Phase 2: During Call */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 800, fontSize: "1.2rem", marginBottom: 15 }}>1</div>
              {renderTimelineCard("During the Call", "What tools can the AI use while speaking?", [
                { id: "knowledge_base", label: "Knowledge Base", icon: "📚", phase: "during_call" },
                { id: "human_transfer", label: "Human Transfer", icon: "📞", phase: "during_call" },
                { id: "shopify", label: "Shopify Lookup", icon: "🛍️", phase: "during_call" },
              ])}
            </div>
            
            <div style={{ width: 4, height: 60, background: "linear-gradient(to bottom, var(--blue), #10b981)" }} />
            
            {/* Phase 3: Post Call */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 800, fontSize: "1.2rem", marginBottom: 15 }}>2</div>
              {renderTimelineCard("After the Call", "What automations run when the user hangs up?", [
                { id: "email_summary", label: "Email Summary", icon: "📧", phase: "post_call" },
                { id: "webhook_post", label: "Webhook", icon: "🪝", phase: "post_call" },
                { id: "airtable_log", label: "Airtable Log", icon: "📊", phase: "post_call" },
                { id: "hubspot_sync", label: "HubSpot Sync", icon: "🟧", phase: "post_call" },
                { id: "salesforce_sync", label: "Salesforce Sync", icon: "☁️", phase: "post_call" },
              ])}
            </div>

          </div>
          
          {/* Config Panel */}
          <div style={configPane}>
            <div style={{ padding: 24, borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>Configuration</h2>
            </div>
            <div style={{ padding: 24 }}>
              {renderGuide()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
