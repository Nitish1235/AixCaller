'use client';
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
      <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/shopify.svg" alt="Shopify" width={28} height={28} style={{ filter: 'invert(1)' }} />
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
      <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlecalendar.svg" alt="Google Calendar" width={28} height={28} style={{ filter: 'invert(1)' }} />
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
      <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlesheets.svg" alt="Google Sheets" width={28} height={28} style={{ filter: 'invert(1)' }} />
    ),
  },
    {
      name: "HubSpot",
      category: "CRM",
      tagline: "CRM sync with AI calls",
      description:
        "AIxCaller automatically creates/updates contacts, deals and logs call outcomes in HubSpot, keeping your pipeline fresh.",
      capabilities: ["Auto-create contacts", "Deal updates", "Call notes attached", "OAuth 2.0 secure"],
      color: "#FF7A59",
      textColor: "#fff",
      icon: (
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hubspot.svg" alt="HubSpot" width={28} height={28} style={{ filter: 'invert(1)' }} />
      ),
    },
    {
      name: "Salesforce",
      category: "CRM",
      tagline: "Enterprise CRM integration",
      description:
        "Seamlessly push call summaries, leads and activity logs into Salesforce objects during live calls.",
      capabilities: ["Lead creation", "Opportunity updates", "Call notes attached", "OAuth 2.0 secure"],
      color: "#00A1E0",
      textColor: "#fff",
      icon: (
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/salesforce.svg" alt="Salesforce" width={28} height={28} style={{ filter: 'invert(1)' }} />
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 7l10 7 10-7" />
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff" }}>
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    ),
  },
];

const MARQUEE_ITEMS = [
  "Shopify", "Google Calendar", "Google Sheets", "HubSpot", "Salesforce",
  "Email Reports", "Custom API",
  "Shopify", "Google Calendar", "Google Sheets", "HubSpot", "Salesforce",
  "Email Reports", "Custom API",
  "Shopify", "Google Calendar", "Google Sheets", "HubSpot", "Salesforce",
  "Email Reports", "Custom API",
];

const INTEGRATION_RGB: Record<string, string> = {
  "Shopify": "16, 185, 129",
  "Google Calendar": "59, 130, 246",
  "Google Sheets": "16, 185, 129",
  "HubSpot": "255, 122, 89",
  "Salesforce": "0, 161, 224",
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
