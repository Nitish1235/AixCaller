import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AIxCaller — AI-Powered Calling Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #d1fae5 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 100px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative circles */}
        <div style={{
          position: "absolute", top: -100, right: -100,
          width: 500, height: 500, borderRadius: "50%",
          background: "rgba(74,222,128,0.15)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 350, height: 350, borderRadius: "50%",
          background: "rgba(168,85,247,0.08)",
          display: "flex",
        }} />

        {/* Left side — Logo + Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Logo Block */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{
              width: 100, height: 100, borderRadius: "24px",
              background: "#4ADE80",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(74,222,128,0.4)",
            }}>
              {/* SVG Citrus Slice */}
              <svg width="72" height="72" viewBox="0 0 120 120">
                <g transform="rotate(45, 60, 60)">
                  <path d="M10,60 A50,50 0 0,0 110,60 L10,60 Z" fill="#A855F7" opacity="0.35"/>
                  <path d="M15,60 A45,45 0 0,0 105,60 L15,60 Z" fill="#E2E8F0" opacity="0.9"/>
                  <path d="M20,60 A40,40 0 0,0 100,60 L20,60 Z" fill="#A855F7"/>
                  <line x1="60" y1="60" x2="60" y2="100" stroke="white" strokeWidth="2.5" opacity="0.8"/>
                  <line x1="60" y1="60" x2="88" y2="88" stroke="white" strokeWidth="2.5" opacity="0.8"/>
                  <line x1="60" y1="60" x2="32" y2="88" stroke="white" strokeWidth="2.5" opacity="0.8"/>
                  <line x1="60" y1="60" x2="98" y2="70" stroke="white" strokeWidth="2.5" opacity="0.8"/>
                  <line x1="60" y1="60" x2="22" y2="70" stroke="white" strokeWidth="2.5" opacity="0.8"/>
                  <circle cx="60" cy="60" r="5" fill="white"/>
                </g>
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{
                fontSize: "52px", fontWeight: 900, color: "#064E3B",
                letterSpacing: "-2px", lineHeight: 1,
              }}>
                AIxCaller
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: "38px", fontWeight: 800, color: "#1a2e1a",
            lineHeight: 1.25, maxWidth: "600px",
          }}>
            AI-Powered{" "}
            <span style={{ color: "#A855F7" }}>Voice Agents</span>
            <br />
            That Call For You.
          </div>

          {/* Description */}
          <div style={{
            fontSize: "22px", color: "#4B5563", fontWeight: 400,
            maxWidth: "580px", lineHeight: 1.5,
          }}>
            Automate outbound calls, qualify leads & book appointments — on autopilot.
          </div>

          {/* CTA Badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            marginTop: "8px",
          }}>
            <div style={{
              background: "#064E3B", color: "#fff",
              padding: "14px 32px", borderRadius: "12px",
              fontSize: "20px", fontWeight: 700,
            }}>
              Get Started Free →
            </div>
            <div style={{
              background: "rgba(168,85,247,0.12)", color: "#7C3AED",
              padding: "14px 24px", borderRadius: "12px",
              fontSize: "18px", fontWeight: 600, border: "2px solid #A855F7",
            }}>
              🤖 AI Calls
            </div>
          </div>
        </div>

        {/* Right side — Visual Feature Pills */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "16px",
          alignItems: "flex-end",
        }}>
          {[
            { icon: "📞", label: "Outbound Calling", color: "#10B981" },
            { icon: "🧠", label: "Knowledge Base AI", color: "#A855F7" },
            { icon: "📋", label: "Lead Management", color: "#3B82F6" },
            { icon: "📅", label: "Auto Scheduling", color: "#F59E0B" },
            { icon: "📊", label: "Real-time Analytics", color: "#EF4444" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                background: "#fff", borderRadius: "14px",
                padding: "14px 24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                border: `2px solid ${item.color}22`,
                minWidth: "240px",
              }}
            >
              <span style={{ fontSize: "28px" }}>{item.icon}</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a2e1a" }}>
                {item.label}
              </span>
              <div style={{
                marginLeft: "auto", width: "10px", height: "10px",
                borderRadius: "50%", background: item.color,
              }} />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
