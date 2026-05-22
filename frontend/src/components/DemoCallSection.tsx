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
    if (elapsed >= DEMO_DURATION) {
      setCalling(false);
      return;
    }
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
        background: "var(--surface)",
        color: "var(--text)",
        position: "relative",
        overflow: "hidden",
        borderTop: "1.5px solid var(--border)",
        borderBottom: "1.5px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--blue-light)",
              border: "1.5px solid rgba(29, 78, 216, 0.15)",
              padding: "0.5rem 1.4rem",
              borderRadius: 99,
              marginBottom: "1.5rem",
              fontWeight: 700,
              fontSize: "0.82rem",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "var(--blue)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--blue)",
                display: "inline-block",
              }}
            />
            Live Phone Demo — 1 Minute Free
          </div>

          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "0 0 1.5rem",
              letterSpacing: "-1px",
              color: "var(--text)",
            }}
          >
            Talk to Our AI Agent <br />
            <span style={{ background: "linear-gradient(135deg, var(--blue) 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Right Now</span>
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              fontWeight: 500,
              color: "var(--text-muted)",
              maxWidth: 600,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Call our live AI demo agent and experience AIxCaller firsthand.
            Ask it anything — pricing, features, integrations, how it works.
            The call automatically ends after 1 minute.
          </p>
        </div>

        {/* Main card grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "2.5rem",
            alignItems: "stretch",
          }}
        >
          {/* Left: call card */}
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid var(--border)",
              borderRadius: 24,
              padding: "2.5rem",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "1.8rem",
            }}
          >
            {/* Phone icon + pulse */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "var(--blue)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  color: "#fff",
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(29, 78, 216, 0.2)",
                }}
              >
                📞
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    textTransform: "uppercase",
                    color: "var(--blue)",
                    letterSpacing: 1,
                  }}
                >
                  Demo Line — Always On
                </div>
                <div style={{ color: "var(--text-muted)", fontWeight: 550, fontSize: "0.85rem", marginTop: 2 }}>
                  Powered by AIxCaller · Telnyx Voice · OpenAI
                </div>
              </div>
            </div>

            {/* Phone number display */}
            <div
              style={{
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 16,
                padding: "1.75rem",
                textAlign: "center",
              }}
            >
              <div style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.5rem" }}>
                Demo Number
              </div>
              <div
                className="mono"
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 1.9rem)",
                  fontWeight: 800,
                  color: "var(--text)",
                  letterSpacing: 1.5,
                  marginBottom: "0.85rem",
                }}
              >
                {DEMO_NUMBER_DISPLAY}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "var(--green)" : "#fff",
                  border: `1.5px solid ${copied ? "var(--green)" : "var(--border)"}`,
                  color: copied ? "#ffffff" : "var(--text)",
                  borderRadius: 99,
                  padding: "0.45rem 1.2rem",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
              >
                {copied ? "✓ Copied!" : "Copy Number"}
              </button>
            </div>

            {/* Audio console soundwave visualizer */}
            <div style={{ minHeight: "60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {calling ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", height: "35px", marginBottom: "1rem" }}>
                    {[0.6, 0.9, 0.4, 0.8, 0.5, 0.9, 0.7, 0.3, 0.8, 0.6, 0.9, 0.5].map((scale, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: "3px",
                          height: "100%",
                          background: "var(--blue)",
                          borderRadius: "99px",
                          animation: `eq 0.7s infinite alternate ease-in-out`,
                          animationDelay: `${idx * 0.07}s`,
                          boxShadow: "0 0 8px rgba(29, 78, 216, 0.2)",
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Demo time remaining
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: elapsed >= 50 ? "var(--amber)" : "var(--green)",
                      }}
                    >
                      {timeLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--border)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${100 - pct}%`,
                        background: elapsed >= 50 ? "var(--amber)" : "var(--green)",
                        borderRadius: 99,
                        transition: "width 1s linear, background 0.3s",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 500 }}>
                  Start a call to see live voice wave indicator
                </div>
              )}
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <a href={`tel:${DEMO_NUMBER}`} onClick={handleCallNow} style={{ textDecoration: "none" }}>
                <button
                  className="btn-brutal"
                  style={{
                    width: "100%",
                    fontSize: "1.05rem",
                    padding: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                  }}
                >
                  <span>📱</span> Call Now — It&apos;s Free
                </button>
              </a>
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  fontSize: "0.8rem",
                  marginTop: 2,
                }}
              >
                On desktop? Dial&nbsp;
                <span className="mono" style={{ color: "var(--text)", fontWeight: 700 }}>
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
              gap: "2rem",
            }}
          >
            {/* Topics */}
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid var(--border)",
                borderRadius: 24,
                padding: "2rem",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.02)",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "var(--blue)",
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
                      background: "var(--surface)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 12,
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      color: "var(--text)",
                      transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--blue)";
                      e.currentTarget.style.background = "var(--blue-light)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* What to expect */}
            <div
              style={{
                background: "var(--blue-light)",
                border: "1.5px solid rgba(29, 78, 216, 0.15)",
                borderRadius: 24,
                padding: "2rem",
                color: "var(--text)",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "var(--blue)",
                  marginBottom: "1.25rem",
                }}
              >
                What to Expect
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {[
                  "📞 A natural-sounding voice answers in under 1 second",
                  "🧠 Ask anything about AIxCaller — pricing, setup, features",
                  "⏱️ Call automatically ends after 1 minute",
                  "🚀 Sign up and build your custom assistant in 5 minutes",
                ].map((item) => (
                  <div
                    key={item}
                    style={{ fontWeight: 550, fontSize: "0.92rem", lineHeight: 1.5, color: "var(--text)", display: "flex", alignItems: "flex-start", gap: "8px" }}
                  >
                    <span>{item.slice(0,2)}</span>
                    <span>{item.slice(3)}</span>
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
