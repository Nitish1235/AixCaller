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
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {calls.map((call: any) => (
            <div key={call.id} style={{ padding: "1.5rem", background: "#fff", borderRadius: 12, border: "1.5px solid #D1FAE5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 700 }}>{call.from_number}</span>
                <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>{new Date(call.created_at).toLocaleString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#374151" }}>{call.summary || "No summary available."}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
