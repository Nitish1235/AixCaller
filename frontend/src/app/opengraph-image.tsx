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
          {/* Logo Block — waveform mark on white rounded square (brand spec) */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{
              width: 110, height: 110, borderRadius: "26px",
              background: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 36px rgba(16,185,129,0.25)",
              border: "2px solid rgba(16,185,129,0.18)",
            }}>
              <svg width="86" height="86" viewBox="0 0 100 100">
                <rect x="10" y="38" width="8" height="24" rx="4" fill="#86EFAC" />
                <rect x="22" y="18" width="8" height="64" rx="4" fill="#10B981" />
                <rect x="34" y="26" width="8" height="48" rx="4" fill="#064E3B" />
                <rect x="46" y="12" width="8" height="76" rx="4" fill="#10B981" />
                <rect x="58" y="22" width="8" height="56" rx="4" fill="#064E3B" />
                <rect x="70" y="32" width="8" height="36" rx="4" fill="#86EFAC" />
                <rect x="82" y="40" width="8" height="20" rx="4" fill="#86EFAC" />
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
