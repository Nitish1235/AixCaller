"use client";
import { useState, useEffect } from "react";
import { apiGet, apiPatch, getTenantId } from "@/lib/api";

// Removed top-level TENANT_ID constant

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    const tid = getTenantId();
    try {
      const data = await apiGet(`/leads?tenant_id=${tid}`);
      if (data && data.leads) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  const updateStatus = async (leadId: string, newStatus: string) => {
    try {
      await apiPatch(`/leads/${leadId}`, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error("Failed to update lead status", err);
    }
  };

  if (loading) return <div style={{ fontWeight: 900, color: "var(--text)" }}>LOADING LEADS...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h1 style={{ fontWeight: 900, fontSize: "2rem", color: "var(--text)", margin: 0, textTransform: "uppercase" }}>
          Captured Leads & Appointments
        </h1>
        <p style={{ color: "#475569", margin: "8px 0 0", fontSize: "1.1rem", fontWeight: 600 }}>
          Manage potential customers and scheduled meetings captured by your AI.
        </p>
      </div>

      <div className="card" style={{ background: "#fff", padding: "1.5rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ borderBottom: "4px solid var(--text)" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Intent</th>
              <th style={thStyle}>Appointment</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", fontWeight: 900, color: "#64748b" }}>
                  NO LEADS CAPTURED YET
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <td style={tdStyle}>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 900 }}>{l.name || "Unknown"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{l.phone}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{l.email}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.intent}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {l.appointment_date ? (
                      <div style={{ 
                        background: "var(--accent-yellow)", padding: "4px 8px", borderRadius: 8, 
                        border: "2px solid var(--text)", display: "inline-block", fontSize: "0.8rem", fontWeight: 900
                      }}>
                        🗓️ {l.appointment_date} @ {l.appointment_time}
                      </div>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <select 
                      value={l.status} 
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "2px solid var(--text)",
                        background: getStatusBg(l.status), fontWeight: 900, fontSize: "0.8rem",
                        cursor: "pointer", textTransform: "uppercase"
                      }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="booked">Booked</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px", fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase", color: "#64748b"
};

const tdStyle: React.CSSProperties = {
  padding: "16px 12px", fontSize: "0.95rem"
};

const getStatusBg = (status: string) => {
  switch (status) {
    case "new": return "#fff";
    case "contacted": return "var(--accent-blue)";
    case "booked": return "var(--accent-green)";
    case "closed": return "#cbd5e1";
    default: return "#fff";
  }
};
