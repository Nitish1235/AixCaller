"use client";
import { useEffect, useState } from "react";
import { fetchCalls } from "@/lib/api";

const getTenantId = () => {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  const match = document.cookie.match(/(?:^|; )tenant_id=([^;]*)/);
  let tid = match ? decodeURIComponent(match[1]) : null;
  if (tid) { localStorage.setItem("tenant_id", tid); return tid; }
  return localStorage.getItem("tenant_id") || "00000000-0000-0000-0000-000000000000";
};

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const tenantId = getTenantId();

  useEffect(() => {
    fetchCalls(tenantId).then(data => {
      setCalls(data);
      setLoading(false);
    });
  }, [tenantId]);

  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", marginBottom: "1.5rem" }}>Call History</h1>
      {loading ? (
        <p>Loading calls...</p>
      ) : calls.length === 0 ? (
        <div style={{ padding: "4rem", textAlign: "center", background: "#fff", borderRadius: 16, border: "1.5px solid #D1FAE5" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📞</div>
          <h3>No calls yet</h3>
          <p>Your call history will appear here once your agents start talking!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {calls.map((call: any) => {
            const isUnknown = !call.from_number || call.from_number.toLowerCase() === 'unknown';
            const callerDisplay = isUnknown ? 'Caller' : call.from_number;

            return (
              <div key={call.id} style={{ 
                padding: "1.5rem", 
                background: "#fff", 
                borderRadius: 16, 
                border: "1px solid #E5E7EB", 
                display: "flex", 
                flexDirection: "column",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "default"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(16, 185, 129, 0.1)";
                e.currentTarget.style.borderColor = "#10B981";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.03)";
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
              >
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: "50%", 
                      background: "#ECFDF5", color: "#10B981",
                      display: "flex", alignItems: "center", justifyContent: "center", 
                      fontSize: "1.2rem" 
                    }}>
                      📞
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: "#111827", fontSize: "1.05rem" }}>
                        {callerDisplay}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "2px" }}>
                        {new Date(call.created_at).toLocaleDateString()} at {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Body */}
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    margin: 0, fontSize: "0.9rem", color: "#4B5563", lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden"
                  }}>
                    {call.summary || "No summary available for this call."}
                  </p>
                </div>

                {/* Card Footer */}
                <div style={{ 
                  marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #F3F4F6", 
                  display: "flex", justifyContent: "space-between", alignItems: "center" 
                }}>
                  {call.sentiment ? (
                    <span style={{ 
                      fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                      background: call.sentiment === "positive" ? "#ECFDF5" : call.sentiment === "negative" ? "#FEF2F2" : "#F3F4F6",
                      color: call.sentiment === "positive" ? "#10B981" : call.sentiment === "negative" ? "#EF4444" : "#6B7280",
                    }}>
                      {call.sentiment}
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Pending analysis</span>
                  )}

                  {call.duration_seconds > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                      ⏱️ {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
