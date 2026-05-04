"use client";
import { useEffect, useState, useRef } from "react";

interface Message { role: "user" | "assistant"; text: string; timestamp: number; }

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 16,
  boxShadow: "0 2px 12px rgba(16,185,129,0.07)", ...extra,
});

export default function LiveMonitorPage() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [connected, setConnected]   = useState(false);
  const [callId, setCallId]         = useState("call_demo_123");
  const [bars, setBars]             = useState<number[]>(Array(18).fill(3));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!connected) { setBars(Array(18).fill(3)); return; }
    const t = setInterval(() => setBars(prev => prev.map(() => Math.random() * 80 + 10)), 150);
    return () => clearInterval(t);
  }, [connected]);

  const connect = () => {
    if (!callId) return;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    const ws = new WebSocket(`${wsUrl}/live/${callId}`);
    ws.onopen    = () => setConnected(true);
    ws.onmessage = e => { try { const d = JSON.parse(e.data); if (d.text) setMessages(p => [...p, { role: d.role || "assistant", text: d.text, timestamp: Date.now() }]); } catch {} };
    ws.onclose   = () => setConnected(false);
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", margin: 0, letterSpacing: -0.5 }}>Live Monitor</h1>
          <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "0.9rem" }}>Watch your AI agents interact with callers in real-time.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#10B981" : "#D1D5DB", boxShadow: connected ? "0 0 0 3px #D1FAE5" : "none" }} />
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: connected ? "#059669" : "#9CA3AF" }}>{connected ? "CONNECTED" : "DISCONNECTED"}</span>
        </div>
      </div>

      {/* Connect bar */}
      <div style={card({ padding: "1.25rem 1.5rem", display: "flex", gap: 12, alignItems: "center" })}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9CA3AF", display: "block", marginBottom: 6 }}>CALL ID TO MONITOR</label>
          <input
            value={callId} onChange={e => setCallId(e.target.value)}
            disabled={connected}
            placeholder="e.g. call_demo_123"
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #D1FAE5", borderRadius: 9, fontSize: "0.9rem", color: "#064E3B", fontWeight: 600, outline: "none", background: connected ? "#F9FAFB" : "#fff", fontFamily: "monospace" }}
          />
        </div>
        <button
          onClick={connect} disabled={connected}
          style={{ background: connected ? "#ECFDF5" : "#064E3B", color: connected ? "#059669" : "#fff", border: connected ? "1.5px solid #D1FAE5" : "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: "0.88rem", cursor: connected ? "default" : "pointer", whiteSpace: "nowrap", marginTop: 22 }}>
          {connected ? "● Monitoring..." : "Connect to Stream"}
        </button>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", marginTop: 22 }}>Clear</button>
        )}
      </div>

      {/* Live waveform */}
      {connected && (
        <div style={card({ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669" }}>LIVE AUDIO</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40, flex: 1 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 3, background: `hsl(${150 + i * 2}, 65%, ${40 + i}%)`, height: `${h}%`, transition: "height 0.1s ease" }} />
            ))}
          </div>
          <span style={{ fontSize: "0.78rem", color: "#9CA3AF", fontFamily: "monospace" }}>{messages.length} messages</span>
        </div>
      )}

      {/* Transcript */}
      <div style={card({ flex: 1, overflow: "hidden" })}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", margin: 0 }}>Live Transcript</h2>
          <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Auto-scrolling</span>
        </div>

        <div style={{ padding: "1.5rem", minHeight: 400, maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: "1.25rem" }}>
                {connected ? "🎙️" : "📡"}
              </div>
              <div style={{ fontWeight: 700, color: "#064E3B", marginBottom: 6 }}>
                {connected ? "Listening for caller..." : "Not connected"}
              </div>
              <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>
                {connected ? "Transcript will appear here as the call progresses." : "Enter a Call ID and click Connect to monitor a live call."}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row" : "row-reverse", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: msg.role === "assistant" ? "linear-gradient(135deg, #064E3B, #10B981)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>
                  {msg.role === "assistant" ? "🤖" : "👤"}
                </div>
                <div style={{ maxWidth: "70%" }}>
                  <div style={{ fontSize: "0.7rem", color: "#9CA3AF", marginBottom: 4, textAlign: msg.role === "user" ? "left" : "right", fontWeight: 600 }}>
                    {msg.role === "assistant" ? "ARIA (AI)" : "CALLER"} · {fmt(msg.timestamp)}
                  </div>
                  <div style={{
                    padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                    background: msg.role === "assistant" ? "#064E3B" : "#F3F4F6",
                    color: msg.role === "assistant" ? "#fff" : "#374151",
                    fontSize: "0.88rem", lineHeight: 1.5,
                  }}>{msg.text}</div>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.5}50%{opacity:1} }`}</style>
    </div>
  );
}
