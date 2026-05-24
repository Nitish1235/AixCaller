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
          background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 40%, #dbeafe 100%)",
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
          background: "rgba(59,130,246,0.12)",
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
              boxShadow: "0 12px 36px rgba(29,78,216,0.18)",
              border: "2px solid rgba(29,78,216,0.12)",
            }}>
              <svg width="86" height="86" viewBox="0 0 400 400">
          <circle cx="50.0" cy="200.0" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="65.5" cy="224.0" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="81.0" cy="242.1" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="96.5" cy="249.9" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="112.0" cy="245.5" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="127.5" cy="229.9" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="143.0" cy="207.1" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="158.5" cy="182.5" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="174.0" cy="162.2" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="189.5" cy="151.1" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="205.0" cy="152.1" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="220.5" cy="164.7" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="236.0" cy="186.0" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="251.5" cy="210.8" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="267.0" cy="232.8" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="282.5" cy="246.9" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="298.0" cy="249.5" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="313.5" cy="239.9" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="329.0" cy="220.6" r="6.0" fill="#3b82f6" opacity="0.80" />
          <circle cx="344.5" cy="196.2" r="6.0" fill="#3b82f6" opacity="0.80" />
          <path d="M 50.0,200.0 L 65.5,224.0 L 81.0,242.1 L 96.5,249.9 L 112.0,245.5 L 127.5,229.9 L 143.0,207.1 L 158.5,182.5 L 174.0,162.2 L 189.5,151.1 L 205.0,152.1 L 220.5,164.7 L 236.0,186.0 L 251.5,210.8 L 267.0,232.8 L 282.5,246.9 L 298.0,249.5 L 313.5,239.9 L 329.0,220.6 L 344.5,196.2" fill="none" stroke="#3b82f6" stroke-width="2.5" opacity="0.25" />
          <circle cx="50.0" cy="243.3" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="65.5" cy="250.0" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="81.0" cy="244.4" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="96.5" cy="228.0" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="112.0" cy="204.7" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="127.5" cy="180.3" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="143.0" cy="160.7" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="158.5" cy="150.7" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="174.0" cy="152.8" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="189.5" cy="166.4" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="205.0" cy="188.3" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="220.5" cy="213.0" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="236.0" cy="234.6" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="251.5" cy="247.7" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="267.0" cy="249.1" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="282.5" cy="238.5" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="298.0" cy="218.4" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="313.5" cy="193.9" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="329.0" cy="170.8" r="6.0" fill="#60a5fa" opacity="0.80" />
          <circle cx="344.5" cy="154.9" r="6.0" fill="#60a5fa" opacity="0.80" />
          <path d="M 50.0,243.3 L 65.5,250.0 L 81.0,244.4 L 96.5,228.0 L 112.0,204.7 L 127.5,180.3 L 143.0,160.7 L 158.5,150.7 L 174.0,152.8 L 189.5,166.4 L 205.0,188.3 L 220.5,213.0 L 236.0,234.6 L 251.5,247.7 L 267.0,249.1 L 282.5,238.5 L 298.0,218.4 L 313.5,193.9 L 329.0,170.8 L 344.5,154.9" fill="none" stroke="#60a5fa" stroke-width="2.5" opacity="0.25" />
          <circle cx="50.0" cy="243.3" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="65.5" cy="226.0" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="81.0" cy="202.4" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="96.5" cy="178.1" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="112.0" cy="159.2" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="127.5" cy="150.3" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="143.0" cy="153.6" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="158.5" cy="168.2" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="174.0" cy="190.6" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="189.5" cy="215.3" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="205.0" cy="236.3" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="220.5" cy="248.3" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="236.0" cy="248.6" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="251.5" cy="236.9" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="267.0" cy="216.2" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="282.5" cy="191.6" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="298.0" cy="169.0" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="313.5" cy="154.0" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="329.0" cy="150.2" r="6.0" fill="#93c5fd" opacity="0.80" />
          <circle cx="344.5" cy="158.7" r="6.0" fill="#93c5fd" opacity="0.80" />
          <path d="M 50.0,243.3 L 65.5,226.0 L 81.0,202.4 L 96.5,178.1 L 112.0,159.2 L 127.5,150.3 L 143.0,153.6 L 158.5,168.2 L 174.0,190.6 L 189.5,215.3 L 205.0,236.3 L 220.5,248.3 L 236.0,248.6 L 251.5,236.9 L 267.0,216.2 L 282.5,191.6 L 298.0,169.0 L 313.5,154.0 L 329.0,150.2 L 344.5,158.7" fill="none" stroke="#93c5fd" stroke-width="2.5" opacity="0.25" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{
                fontSize: "52px", fontWeight: 900, color: "#1D4ED8",
                letterSpacing: "-2px", lineHeight: 1,
              }}>
                AIxCaller
              </span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: "38px", fontWeight: 800, color: "#0f172a",
            lineHeight: 1.25, maxWidth: "600px",
          }}>
            AI-Powered{" "}
            <span style={{ color: "#7C3AED" }}>Voice Agents</span>
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
              background: "#1D4ED8", color: "#fff",
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
            { icon: "📞", label: "Outbound Calling", color: "#3B82F6" },
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
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
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
