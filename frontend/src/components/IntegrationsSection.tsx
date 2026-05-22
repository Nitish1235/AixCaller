const INTEGRATIONS = [
  {
    name: "Shopify",
    category: "E-Commerce",
    tagline: "Live order intelligence on every call",
    description:
      "During a call, your AI instantly looks up order status, tracking info, item lists, refund state, and shipping address — no hold music, no manual lookup.",
    capabilities: ["Order status & tracking", "Refund checks", "Item details", "Shipping address"],
    color: "#96BF48",
    textColor: "#1a2e00",
    icon: (
      <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
        <path d="M34.5 13.5c-.1-.7-.7-1.1-1.2-1.2-.5-.1-5.4-.4-5.4-.4s-3.6-3.5-4-3.9c-.4-.4-1.2-.3-1.5-.2l-2.1.6c-.5-1.4-1.2-2.5-2.1-3.3C17 4 15.7 3.5 14.3 3.5c-.1 0-.2 0-.3.1-.4-.5-.9-.7-1.4-.7-3.5 0-5.2 4.4-5.7 6.6L4 10.7c-1 .3-1 .3-1.1 1.3L1 28.7l16.5 3.1L26 30l8.5-2.5c0 0 .1-13.3 0-14zm-12.3-4.8c-.9.3-1.9.6-3 .9 0-.5.1-1.4.4-2.4.6.1 1.8.6 2.6 1.5zm-3.7-2.6c.3 0 .5.1.7.2-1 .5-2.1 1.6-2.5 4.1l-3.3 1c.5-2.3 1.9-5.3 5.1-5.3zm.1 14.6c-.4 0-.7-.2-.8-.5-.1-.3.1-.6.5-.7.3-.1.6 0 .8.2l.1.1c.1.3 0 .6-.3.8l-.3.1zm5.2-11.2c-.7-.7-1.7-1.1-2.7-1.1-.1 0-.2 0-.3 0 .1-.4.2-.8.3-1.1.8.1 1.9.6 2.7 1.2z" fill="#fff" opacity=".8"/>
        <rect x="6" y="10" width="36" height="28" rx="4" fill="#fff" opacity=".15"/>
        <text x="24" y="29" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily="monospace">S</text>
      </svg>
    ),
  },
  {
    name: "Google Calendar",
    category: "Scheduling",
    tagline: "Book appointments mid-call, instantly",
    description:
      "AI checks real-time availability and books calendar slots while the caller is still on the line. No back-and-forth emails — confirmed in seconds.",
    capabilities: ["Real-time availability check", "Instant slot booking", "Calendar invite sent", "No-show follow-up"],
    color: "#4285F4",
    textColor: "#fff",
    icon: (
      <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
        <rect x="6" y="8" width="36" height="34" rx="4" fill="#fff" opacity=".2"/>
        <rect x="6" y="8" width="36" height="10" rx="4" fill="#fff" opacity=".3"/>
        <line x1="6" y1="22" x2="42" y2="22" stroke="#fff" strokeWidth="1.5" opacity=".4"/>
        <rect x="14" y="26" width="6" height="6" rx="1" fill="#fff" opacity=".7"/>
        <rect x="28" y="26" width="6" height="6" rx="1" fill="#fff" opacity=".4"/>
        <rect x="14" y="35" width="6" height="5" rx="1" fill="#fff" opacity=".4"/>
        <rect x="28" y="35" width="6" height="5" rx="1" fill="#fff" opacity=".4"/>
        <line x1="16" y1="6" x2="16" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="32" y1="6" x2="32" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: "Google Sheets",
    category: "Data & Reporting",
    tagline: "Every lead auto-logged, zero manual entry",
    description:
      "Call summaries, captured leads, and booked appointments flow directly into your Google Sheet after every call — fully structured, ready for your team.",
    capabilities: ["Lead auto-logging", "Call summaries exported", "Appointment records", "Custom columns"],
    color: "#0F9D58",
    textColor: "#fff",
    icon: (
      <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
        <rect x="8" y="6" width="32" height="36" rx="4" fill="#fff" opacity=".2"/>
        <line x1="8" y1="18" x2="40" y2="18" stroke="#fff" strokeWidth="1.5" opacity=".5"/>
        <line x1="8" y1="27" x2="40" y2="27" stroke="#fff" strokeWidth="1.5" opacity=".5"/>
        <line x1="8" y1="36" x2="40" y2="36" stroke="#fff" strokeWidth="1.5" opacity=".5"/>
        <line x1="22" y1="6" x2="22" y2="42" stroke="#fff" strokeWidth="1.5" opacity=".5"/>
        <rect x="23" y="19" width="9" height="7" rx="1" fill="#fff" opacity=".6"/>
        <rect x="9" y="28" width="12" height="7" rx="1" fill="#fff" opacity=".4"/>
      </svg>
    ),
  },
  {
    name: "Zoho CRM",
    category: "CRM",
    tagline: "Calls become CRM entries automatically",
    description:
      "Post-call, AIxCaller creates or updates contacts and leads in Zoho with full transcript, sentiment, and action items — your pipeline always up to date.",
    capabilities: ["Auto-create leads", "Contact sync", "Call notes attached", "OAuth 2.0 secure"],
    color: "#E42527",
    textColor: "#fff",
    icon: (
      <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
        <rect x="6" y="6" width="36" height="36" rx="6" fill="#fff" opacity=".15"/>
        <text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" fontFamily="sans-serif">Z</text>
        <circle cx="24" cy="24" r="16" stroke="#fff" strokeWidth="2" opacity=".2"/>
      </svg>
    ),
  },
  {
    name: "Email Summaries",
    category: "Reporting",
    tagline: "Post-call reports delivered automatically",
    description:
      "Seconds after a call ends, receive a structured email with AI summary, sentiment score, action items, and the full transcript — zero manual effort.",
    capabilities: ["AI call summary", "Sentiment score", "Action items", "Full transcript"],
    color: "#F59E0B",
    textColor: "#1a1a00",
    icon: (
      <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
        <rect x="6" y="12" width="36" height="26" rx="4" fill="#fff" opacity=".2"/>
        <rect x="6" y="12" width="36" height="26" rx="4" stroke="#fff" strokeWidth="2" opacity=".5"/>
        <path d="M6 16l18 12 18-12" stroke="#fff" strokeWidth="2" opacity=".7" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: "Custom API",
    category: "Developer",
    tagline: "Connect any system you already use",
    description:
      "Define custom endpoints — your AI agent calls them mid-conversation to fetch inventory, check bookings, query databases, or trigger any business logic.",
    capabilities: ["Any REST endpoint", "Auth headers support", "Mid-call data fetch", "No-code config"],
    color: "#7C3AED",
    textColor: "#fff",
    icon: (
      <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
        <rect x="6" y="10" width="36" height="28" rx="4" fill="#fff" opacity=".15"/>
        <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff" fontFamily="monospace">{`{}`}</text>
        <circle cx="12" cy="14" r="2" fill="#fff" opacity=".6"/>
        <circle cx="18" cy="14" r="2" fill="#fff" opacity=".4"/>
        <circle cx="24" cy="14" r="2" fill="#fff" opacity=".3"/>
      </svg>
    ),
  },
];

const MARQUEE_ITEMS = [
  "Shopify", "Google Calendar", "Google Sheets", "Zoho CRM",
  "Email Reports", "Custom API",
  "Shopify", "Google Calendar", "Google Sheets", "Zoho CRM",
  "Email Reports", "Custom API",
  "Shopify", "Google Calendar", "Google Sheets", "Zoho CRM",
  "Email Reports", "Custom API",
];

const INTEGRATION_RGB: Record<string, string> = {
  "Shopify": "16, 185, 129", // Keep clean emerald tint
  "Google Calendar": "59, 130, 246",
  "Google Sheets": "16, 185, 129",
  "Zoho CRM": "239, 68, 68",
  "Email Summaries": "245, 158, 11",
  "Custom API": "99, 102, 241"
};

export default function IntegrationsSection() {
  return (
    <section
      id="integrations"
      style={{
        padding: "8rem 5%",
        background: "radial-gradient(circle at 50% 100%, rgba(29, 78, 216, 0.03) 0%, transparent 80%), var(--bg)",
        borderTop: "1.5px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <div style={{
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
          }}>
            🔌 6 Native Integrations
          </div>
          <h2 style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.1,
            margin: "0 0 1.5rem",
            letterSpacing: "-1px",
            color: "var(--text)",
          }}>
            Works With Your <br />
            <span style={{ background: "linear-gradient(135deg, var(--blue) 0%, var(--primary) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Entire Stack</span>
          </h2>
          <p style={{
            fontSize: "1.1rem",
            fontWeight: 500,
            color: "var(--text-muted)",
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            Connect the tools your business already runs on. Your AI agent
            reads, writes, and syncs data across all of them — live, during every call.
          </p>
        </div>

        {/* Scrolling marquee */}
        <div style={{
          borderTop: "1.5px solid var(--border)",
          borderBottom: "1.5px solid var(--border)",
          background: "var(--surface)",
          padding: "1.25rem 0",
          overflow: "hidden",
          marginBottom: "4.5rem",
        }}>
          <div style={{
            display: "flex",
            gap: "2.5rem",
            animation: "scroll 25s linear infinite",
            width: "max-content",
          }}>
            {MARQUEE_ITEMS.map((name, i) => (
              <span key={i} style={{
                fontWeight: 800,
                fontSize: "0.95rem",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                color: "var(--text)",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}>
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--blue)",
                  display: "inline-block",
                  flexShrink: 0,
                  boxShadow: "0 0 6px rgba(29, 78, 216, 0.4)",
                }} />
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Integration cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "2.5rem",
        }}>
          {INTEGRATIONS.map((intg) => {
            const rgb = INTEGRATION_RGB[intg.name] || "16, 185, 129";
            return (
              <div
                key={intg.name}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  border: "1.5px solid var(--border)",
                  background: "#ffffff",
                }}
              >
                {/* Coloured header strip with brand color gradient */}
                <div style={{
                  background: `linear-gradient(135deg, rgba(${rgb}, 0.04) 0%, rgba(${rgb}, 0.01) 100%)`,
                  padding: "1.5rem",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                  borderBottom: `1.5px solid var(--border)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      background: `rgb(${rgb})`,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 4px 10px rgba(${rgb}, 0.2)`,
                    }}>
                      {intg.icon}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        color: "var(--text)",
                        lineHeight: 1.1,
                        textTransform: "uppercase",
                      }}>
                        {intg.name}
                      </div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        color: `rgb(${rgb})`,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        marginTop: 4,
                      }}>
                        {intg.category}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: `rgba(${rgb}, 0.08)`,
                    border: `1.5px solid rgba(${rgb}, 0.2)`,
                    borderRadius: 99,
                    padding: "3px 11px",
                    fontWeight: 700,
                    fontSize: "0.68rem",
                    color: `rgb(${rgb})`,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    ● Live
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: "0.98rem",
                    color: "var(--text)",
                    lineHeight: 1.4,
                  }}>
                    {intg.tagline}
                  </div>
                  <div style={{
                    fontWeight: 500,
                    fontSize: "0.88rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                  }}>
                    {intg.description}
                  </div>

                  {/* Capability pills */}
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.45rem",
                    marginTop: "auto",
                    paddingTop: "0.5rem",
                  }}>
                    {intg.capabilities.map((cap) => (
                      <span key={cap} style={{
                        background: "var(--surface)",
                        border: "1.5px solid var(--border)",
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        color: "var(--text-body)",
                      }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coming soon strip */}
        <div style={{
          marginTop: "3.5rem",
          border: "1.5px solid var(--border)",
          borderRadius: 24,
          padding: "2rem",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.02)",
        }}>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
              color: "var(--text)",
              letterSpacing: 0.5,
            }}>
              More coming soon
            </div>
            <div style={{ fontWeight: 550, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Twilio · WhatsApp Business · Calendly · Stripe · ServiceNow · Intercom
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Not on the list?
            </span>
            <div style={{
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              borderRadius: 99,
              padding: "0.5rem 1.4rem",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "var(--text)",
              cursor: "pointer",
              transition: "var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--blue)";
              e.currentTarget.style.color = "var(--blue)";
              e.currentTarget.style.background = "var(--blue-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.background = "var(--surface)";
            }}
            >
              Custom API connects anything →
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
