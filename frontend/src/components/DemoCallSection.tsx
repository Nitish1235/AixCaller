"use client";

import { useState, useEffect } from "react";

const DEMO_NUMBER = "+13322446316";
const DEMO_NUMBER_DISPLAY = "+1 (332) 244-6316";
const DEMO_DURATION = 60;

const DEMO_TOPICS = [
  { icon: "💰", label: "Pricing & Plans" },
  { icon: "⚡", label: "Setup Process" },
  { icon: "🌍", label: "Supported Countries" },
  { icon: "🔌", label: "Integrations" },
  { icon: "📞", label: "How Calls Work" },
  { icon: "🏥", label: "Use Cases" },
];

export default function DemoCallSection() {
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [calling, setCalling] = useState(false);

  // Fake visual timer that runs after user clicks "Call Now"
  useEffect(() => {
    if (!calling) return;
    if (elapsed >= DEMO_DURATION) return;
    const t = setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => clearTimeout(t);
  }, [calling, elapsed]);

  const handleCopy = () => {
    navigator.clipboard.writeText(DEMO_NUMBER_DISPLAY).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCallNow = () => {
    setCalling(true);
    setElapsed(0);
    // tel: link opens native dialer on mobile
    window.location.href = `tel:${DEMO_NUMBER}`;
  };

  const pct = Math.min((elapsed / DEMO_DURATION) * 100, 100);
  const remaining = Math.max(DEMO_DURATION - elapsed, 0);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeLabel = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <section
      id="live-demo"
      style={{
        padding: "8rem 5%",
        background: "var(--text)",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-4rem",
          right: "-4rem",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "var(--accent-green)",
          opacity: 0.08,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-6rem",
          left: "-6rem",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "var(--accent-pink)",
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "var(--accent-green)",
              border: "2px solid #fff",
              padding: "0.5rem 1.4rem",
              borderRadius: 99,
              marginBottom: "1.5rem",
              fontWeight: 900,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "var(--text)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--text)",
                display: "inline-block",
                animation: "eq 1s infinite alternate ease-in-out",
              }}
            />
            Live Phone Demo — 1 Minute Free
          </div>

          <h2
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 1,
              margin: "0 0 1.5rem",
              letterSpacing: -1,
            }}
          >
            Talk to Our AI Agent <br />
            <span style={{ color: "var(--accent-green)" }}>Right Now</span>
          </h2>
          <p
            style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "#94a3b8",
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            Call our live AI demo agent and experience AIxCaller firsthand.
            Ask it anything — pricing, features, integrations, how it works.
            The call auto-ends at 1 minute.
          </p>
        </div>

        {/* Main card grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "2rem",
            alignItems: "stretch",
          }}
        >
          {/* Left: call card */}
          <div
            style={{
              background: "#0f172a",
              border: "3px solid #334155",
              borderRadius: 16,
              padding: "2.5rem",
              boxShadow: "8px 8px 0 var(--accent-green)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Phone icon + pulse */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "var(--accent-green)",
                  border: "3px solid #fff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  flexShrink: 0,
                }}
              >
                📞
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: "1rem",
                    textTransform: "uppercase",
                    color: "var(--accent-green)",
                    letterSpacing: 1,
                  }}
                >
                  Demo Line — Always On
                </div>
                <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.9rem" }}>
                  Powered by AIxCaller · Deepgram · OpenAI
                </div>
              </div>
            </div>

            {/* Phone number display */}
            <div
              style={{
                background: "#1e293b",
                border: "2px solid #334155",
                borderRadius: 12,
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#64748b", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.5rem" }}>
                Demo Number
              </div>
              <div
                className="mono"
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: 2,
                  marginBottom: "0.75rem",
                }}
              >
                {DEMO_NUMBER_DISPLAY}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "var(--accent-green)" : "transparent",
                  border: `2px solid ${copied ? "var(--accent-green)" : "#334155"}`,
                  color: copied ? "var(--text)" : "#94a3b8",
                  borderRadius: 8,
                  padding: "0.4rem 1rem",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? "✓ Copied!" : "Copy Number"}
              </button>
            </div>

            {/* Timer bar (shows after clicking Call Now) */}
            {calling && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase" }}>
                    Demo time remaining
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontWeight: 900,
                      fontSize: "1.1rem",
                      color: elapsed >= 50 ? "var(--accent-pink)" : "var(--accent-green)",
                    }}
                  >
                    {timeLabel}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#1e293b",
                    border: "2px solid #334155",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${100 - pct}%`,
                      background: elapsed >= 50 ? "var(--accent-pink)" : "var(--accent-green)",
                      borderRadius: 99,
                      transition: "width 1s linear, background 0.3s",
                    }}
                  />
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <a href={`tel:${DEMO_NUMBER}`} onClick={handleCallNow} style={{ textDecoration: "none" }}>
                <button
                  className="btn-brutal"
                  style={{
                    width: "100%",
                    fontSize: "1.15rem",
                    padding: "1rem",
                    background: "var(--accent-green)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>📱</span> Call Now — It&apos;s Free
                </button>
              </a>
              <div
                style={{
                  textAlign: "center",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                On desktop? Dial&nbsp;
                <span className="mono" style={{ color: "#94a3b8", fontWeight: 900 }}>
                  {DEMO_NUMBER_DISPLAY}
                </span>
                &nbsp;from your phone
              </div>
            </div>
          </div>

          {/* Right: what you can ask */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Topics */}
            <div
              style={{
                background: "#0f172a",
                border: "3px solid #334155",
                borderRadius: 16,
                padding: "2rem",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "#64748b",
                  marginBottom: "1.25rem",
                }}
              >
                Ask the AI About
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                {DEMO_TOPICS.map((t) => (
                  <div
                    key={t.label}
                    style={{
                      background: "#1e293b",
                      border: "2px solid #334155",
                      borderRadius: 10,
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "#e2e8f0",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* What to expect */}
            <div
              style={{
                background: "var(--accent-green)",
                border: "3px solid #fff",
                borderRadius: 16,
                padding: "1.75rem",
                color: "var(--text)",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: "1rem",
                }}
              >
                What to Expect
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {[
                  "📞 A real AI voice answers in under 2 seconds",
                  "🧠 Ask anything about AIxCaller — pricing, features, setup",
                  "⏱️  Call automatically ends after 1 minute",
                  "🚀 Then sign up and build your own in 5 minutes",
                ].map((item) => (
                  <div
                    key={item}
                    style={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.4 }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
