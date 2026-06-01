'use client';
import Link from "next/link";
import ClaimNumberSection from "@/components/ClaimNumberSection";
import DemoCallSection from "@/components/DemoCallSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import styles from "@/app/Landing.module.css";

export const dynamic = "force-dynamic";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "SiteNavigationElement",
          "position": 1,
          "name": "Transparent Pricing",
          "url": "https://aixcaller.com/#pricing"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 2,
          "name": "Real Estate AI",
          "url": "https://aixcaller.com/use-cases/real-estate-ai-voice-agent"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 3,
          "name": "Dental Receptionist",
          "url": "https://aixcaller.com/use-cases/dental-receptionist-ai"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 4,
          "name": "Sign In",
          "url": "https://aixcaller.com/login"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is an AI receptionist and how does it work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "An AI receptionist is an automated phone answering service that uses voice AI to greet callers, answer questions, book appointments, and transfer calls — exactly like a human receptionist, but available 24/7 at a fraction of the cost. AIxCaller's AI receptionist is trained on your business documents and responds in under one second."
          }
        },
        {
          "@type": "Question",
          "name": "What is a virtual receptionist and is it the same as an AI receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A virtual receptionist handles incoming calls remotely instead of in-person. An AI virtual receptionist like AIxCaller goes further — it operates 24/7 with no human involvement, answers instantly without hold times, books appointments live during the call, and costs a fraction of a human agent. AIxCaller combines the best of both: the availability of a 24/7 call answering service with the intelligence of conversational AI."
          }
        },
        {
          "@type": "Question",
          "name": "How much does an AI call answering service cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AIxCaller's AI call answering service starts at $50/month for the Starter plan (200 minutes, 1 agent). Pro is $119/month (500 minutes, 2 agents) and Premium is $250/month (1,100 minutes, 4 agents). No setup fees, no contracts. Compare this to a human receptionist at $3,000+/month — most businesses break even on day one."
          }
        },
        {
          "@type": "Question",
          "name": "Can the AI answering service book appointments automatically?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AIxCaller connects to Google Calendar and books appointments in real-time during the call — checking availability and confirming bookings without any human involvement. The caller receives a confirmation SMS immediately after."
          }
        },
        {
          "@type": "Question",
          "name": "What businesses benefit most from an AI receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Dental offices, HVAC and plumbing companies, real estate agencies, law firms, restaurants, e-commerce stores, and healthcare clinics see the highest ROI. Any business that receives phone calls and cannot afford to miss them benefits from an AI call answering service."
          }
        },
        {
          "@type": "Question",
          "name": "Does AIxCaller work with my existing phone number?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. You can forward your existing business number to AIxCaller — no number porting required. Alternatively, provision a brand-new local or toll-free number in 31+ countries directly from the dashboard in under 2 minutes."
          }
        },
        {
          "@type": "Question",
          "name": "Can the AI receptionist transfer calls to a human?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. You configure your team's working hours, and AIxCaller automatically offers live transfer to a human agent during business hours. Outside those hours, the AI virtual receptionist handles calls fully on its own."
          }
        },
        {
          "@type": "Question",
          "name": "Does the AI phone answering service integrate with CRM software?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AIxCaller integrates with HubSpot, Salesforce, Shopify, Airtable, and Google Sheets. After every call, lead data, transcripts, and sentiment scores are automatically synced to your CRM — no manual entry required."
          }
        },
        {
          "@type": "Question",
          "name": "How quickly can I set up an AI receptionist for my business?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most businesses are live in under 10 minutes. You write a short personality prompt, upload your FAQ document or paste your website URL, claim a phone number, and your AI call answering service is live. No coding or technical skills required."
          }
        },
        {
          "@type": "Question",
          "name": "Can the AI caller handle outbound sales calls too?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AIxCaller includes a full outbound AI dialer. Upload a CSV of leads, set your calling window and timezone, and the AI agent dials, qualifies, and books appointments automatically — including speed-to-lead (calling new web-form leads in under 60 seconds), smart retry cadence, and voicemail drops."
          }
        },
        {
          "@type": "Question",
          "name": "Is an AI answering service TCPA and DNC compliant?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AIxCaller includes a built-in Do Not Call (DNC) registry. Any number on your DNC list is never dialed regardless of campaign status. The system also respects local calling hours per lead timezone, reducing compliance risk. Always consult your legal counsel for jurisdiction-specific requirements."
          }
        },
        {
          "@type": "Question",
          "name": "What languages does the AI receptionist support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AIxCaller currently supports English with a range of ultra-realistic voices (male and female). Additional language support is on the roadmap. The AI can be instructed in the system prompt to respond in specific languages if the caller initiates in that language."
          }
        },
        {
          "@type": "Question",
          "name": "How is AIxCaller different from Bland AI or other AI callers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AIxCaller combines inbound AI receptionist and outbound AI dialer in a single platform — most competitors offer only one or the other. It also includes native integrations (HubSpot, Shopify, Google Calendar, Airtable), a built-in knowledge base, live human transfer with business-hours routing, and a no-code dashboard. Pricing starts at $50/month with no per-minute API markups."
          }
        }
      ]
    }
  ]
};

const videoLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Live Demo — AI Receptionist Answering a Real Business Call | AIxCaller",
  "description": "Watch AIxCaller's AI receptionist answer a real inbound call in under 1 second. The virtual call answering service greets the caller, answers FAQs, and books an appointment via Google Calendar — all without any human involvement.",
  "thumbnailUrl": "https://aixcaller.com/opengraph-image",
  "uploadDate": "2025-01-15",
  "contentUrl": "https://aixcaller.com/#demo",
  "embedUrl": "https://aixcaller.com/#demo",
  "publisher": {
    "@type": "Organization",
    "name": "AIxCaller",
    "logo": { "@type": "ImageObject", "url": "https://aixcaller.com/logo.svg" }
  }
};

export default function Home() {
  return (
    <main style={{ paddingBottom: "0rem", overflowX: "hidden" }}>
      {/* JSON-LD Structured Data for Google SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }}
      />
      
      {/* Dynamic light mesh animation blobs */}
      <div className="bg-mesh">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* ── HERO ── */}
      <section className={styles.heroSection}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Glow Badge */}
          <div className="badge" style={{ marginBottom: "2rem", display: "inline-flex", gap: "10px" }}>
            {/* Equalizer Visual */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 12 }}>
              <div style={{ width: 3, height: 8, background: "var(--blue)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", transformOrigin: "bottom" }} />
              <div style={{ width: 3, height: 12, background: "var(--blue)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", animationDelay: "0.2s", transformOrigin: "bottom" }} />
              <div style={{ width: 3, height: 6, background: "var(--blue)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", animationDelay: "0.4s", transformOrigin: "bottom" }} />
            </div>
            <span>Enterprise-Grade AI Voice Platform</span>
          </div>
          
          <h1 style={{
            fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            margin: "0 0 1.5rem",
            letterSpacing: "-2px",
            color: "var(--text)"
          }}>
            AI Receptionist & Virtual <br />
            <span style={{
              background: "linear-gradient(135deg, var(--blue) 0%, #3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Call Answering Service
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(1.1rem, 2vw, 1.3rem)",
            fontWeight: 500,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            margin: "0 auto 3rem",
            maxWidth: 700
          }}>
            Never miss an inbound call or a follow-up. AIxCaller acts as your 24/7 virtual receptionist — answering calls instantly, qualifying leads, booking appointments directly into your calendar, and syncing every interaction to your CRM.
          </p>
          
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "3rem" }}>
            <Link href="/signup">
              <button className="btn-brutal" style={{ fontSize: "1.1rem", padding: "1rem 2.5rem" }}>Start Building Free →</button>
            </Link>
            <a href="#how-it-works">
              <button className="btn-brutal white" style={{ fontSize: "1.1rem", padding: "1rem 2.5rem" }}>See How It Works</button>
            </a>
          </div>

          {/* Social Proof */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ display: "flex" }}>
              {[
                { text: "JD", bg: "var(--blue)" },
                { text: "SK", bg: "#7c3aed" },
                { text: "ML", bg: "#059669" },
                { text: "99+", bg: "#d97706" }
              ].map((av, idx) => (
                <div key={idx} style={{
                  width: 36, height: 36, borderRadius: "50%", border: "2.5px solid #fff",
                  marginLeft: idx === 0 ? 0 : -10, fontSize: "0.75rem", fontWeight: 800, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", background: av.bg
                }}>
                  {av.text}
                </div>
              ))}
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
              Trusted by <strong style={{ color: "var(--text)" }}>2,500+</strong> small businesses globally.
            </div>
          </div>
        </div>
      </section>

      {/* ── METRIC STRIP ── */}
      <div style={{ borderTop: "1.5px solid var(--border)", borderBottom: "1.5px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem", padding: "3rem 5%", maxWidth: 1200, margin: "0 auto" }}>
          {[
            { num: "99.8%", label: "Answering Rate" },
            { num: "< 1.2s", label: "Voice Latency" },
            { num: "250K+", label: "Calls Handled" },
            { num: "$1.2M+", label: "Client Revenue Driven" }
          ].map((item, idx) => (
            <div key={idx} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--blue)", letterSpacing: "-1px" }}>{item.num}</div>
              <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginTop: "0.25rem", letterSpacing: "0.5px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS (Timeline steps) ── */}
      <section id="how-it-works" style={{ padding: "7rem 5% 5rem", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span className="badge" style={{ marginBottom: "1rem" }}>Execution Flow</span>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-1.5px", color: "var(--text)", margin: 0 }}>
            Set Up Your AI Phone Agent in 4 Steps
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 0, marginTop: "2rem" }}>
          {[
            { step: "01", title: "Train Your AI", desc: "Write personality prompt & upload PDFs/FAQs/knowledge base." },
            { step: "02", title: "Claim Number", desc: "Get a new local/toll-free number or forward your own.", active: true },
            { step: "03", title: "Go Live 24/7", desc: "AI answers instantly, booking calendars and logging leads." },
            { step: "04", title: "Scale Revenue", desc: "Watch analytics grow and let AI capture every missed call." }
          ].map((p, idx) => (
            <div key={idx} style={{
              textAlign: "center", padding: "2.5rem 1.5rem", position: "relative",
              border: "1.5px solid var(--border)", background: p.active ? "var(--blue-light)" : "#fff",
              borderColor: p.active ? "rgba(29,78,216,0.2)" : "var(--border)",
              borderRadius: idx === 0 ? "16px 0 0 16px" : idx === 3 ? "0 16px 16px 0" : "0"
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", margin: "0 auto 1.25rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.9rem",
                background: p.active ? "var(--blue)" : "var(--surface)",
                border: p.active ? "1.5px solid var(--blue)" : "1.5px solid var(--border)",
                color: p.active ? "#fff" : "var(--text-muted)"
              }}>
                {p.step}
              </div>
              <h4 style={{ fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.5rem", color: "var(--text)" }}>{p.title}</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE DEMO CALL SECTION ── */}
      <DemoCallSection />

      {/* ── PLATFORM FEATURES (BENTO GRID STYLE) ── */}
      <section id="features" style={{ padding: "6rem 5%", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span className="badge" style={{ marginBottom: "1rem" }}>Platform Features</span>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-1.5px", color: "var(--text)", margin: "0 0 0.5rem" }}>
            Everything You Need in an AI Call Answering Service
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
            Your virtual receptionist handles inbound calls, outbound campaigns, CRM sync, and appointment booking — all from one platform.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "2rem" }}>
          {/* Telephony Card */}
          <div className="card" style={{ gridRow: "span 2", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--amber)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: "0.5rem" }}>
                Instant Telephony
              </div>
              <h3 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 1rem", lineHeight: 1.2, color: "var(--text)" }}>Real Business Numbers in 2 Minutes</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 2rem" }}>
                Provision local and toll-free numbers in 31+ countries — no telecom setup, no contracts. Pick a country and area code, and your AI receptionist starts answering calls instantly.
              </p>
            </div>
            
            <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1, background: "#fff", border: "1.5px solid var(--border)", padding: "0.85rem 1rem", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", color: "var(--text)" }}>
                  🇺🇸 United States (US) <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>▼</span>
                </div>
                <div className="mono" style={{ flex: 0.5, background: "#fff", border: "1.5px solid var(--border)", padding: "0.85rem", borderRadius: 10, textAlign: "center", fontSize: "0.9rem", color: "var(--text)" }}>Area: 415</div>
              </div>
              <div style={{ background: "var(--green-light)", marginTop: "1rem", textAlign: "center", padding: "1rem", border: "1.5px solid rgba(5, 150, 105, 0.2)", borderRadius: 10, color: "var(--green)", fontWeight: 700 }}>
                Number: <span className="mono" style={{ letterSpacing: 1 }}>+1 (415) 882-9910</span>
              </div>
            </div>
          </div>

          {/* Knowledge Base Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--blue)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: "0.5rem" }}>
                Vector Training
              </div>
              <h3 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 1rem", lineHeight: 1.2, color: "var(--text)" }}>Instant Knowledge Training</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                Upload PDFs, paste website URLs, or write custom prompts. Your AI phone agent absorbs your business details to answer caller questions accurately.
              </p>
            </div>
            <div style={{ background: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: 16, padding: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>Drop PDF files here or paste URL</div>
              <div className="mono" style={{ display: "inline-block", background: "var(--blue-light)", border: "1.5px solid rgba(29, 78, 216, 0.15)", color: "var(--blue)", padding: "0.3rem 0.9rem", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700, marginTop: 10 }}>Uploading manual.pdf...</div>
            </div>
          </div>

          {/* Templates Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--green)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: "0.5rem" }}>
                Ready Deploy
              </div>
              <h3 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 1rem", lineHeight: 1.2, color: "var(--text)" }}>Pre-Built Industry Blueprints</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                Launch a pre-configured AI receptionist specialized in your domain. Skip setup with curated templates optimized for direct conversions.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Link href="/use-cases/dental-receptionist-ai" style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", padding: "0.85rem", borderRadius: 12, textAlign: "center", fontWeight: 700, color: "var(--text)", transition: "var(--transition)" }}
                     onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--blue)"}
                     onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}>🦷 Dental Desk</div>
              </Link>
              <Link href="/use-cases/real-estate-ai-voice-agent" style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", padding: "0.85rem", borderRadius: 12, textAlign: "center", fontWeight: 700, color: "var(--text)", transition: "var(--transition)" }}
                     onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--blue)"}
                     onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}>🏠 Realtor Bot</div>
              </Link>
            </div>
          </div>

          {/* Post-Call Email Summaries Card (wide bento box) */}
          <div className="card" style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "2.5rem", alignItems: "center" }}>
            <div style={{ flex: "1 1 400px" }}>
              <div style={{ color: "var(--blue)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: "0.5rem" }}>
                Post-Call Automation
              </div>
              <h3 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 1rem", lineHeight: 1.2, color: "var(--text)" }}>Receive Instant Post-Call Summaries</h3>
              <p style={{ fontSize: "1rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                Stay informed without opening the dashboard. As soon as a call ends, AIxCaller emails you the conversation log, caller intent, and full transcript.
              </p>
            </div>
            
            {/* Elegant light dashboard log console */}
            <div className="mono" style={{
              flex: "1 1 350px", background: "var(--surface)", border: "1.5px solid var(--border)",
              borderRadius: 16, padding: "1.5rem", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.02)"
            }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.6rem", display: "flex", justifyContent: "space-between" }}>
                <span>FROM: agent@aixcaller.com</span>
                <span>1 min ago</span>
              </div>
              <div style={{ color: "var(--text)", fontSize: "0.95rem", marginBottom: "1rem", borderBottom: "1.5px solid var(--border)", paddingBottom: "0.8rem", fontWeight: 700 }}>
                SUBJECT: Lead Captured - Sarah Jenkins
              </div>
              <div style={{ color: "var(--green)", marginBottom: "0.8rem", fontSize: "0.88rem", fontWeight: 700 }}>
                ✅ Goal Achieved: Scheduled Free Demo
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6, paddingBottom: "1rem", borderBottom: "1.5px solid var(--border)", marginBottom: "1rem" }}>
                <strong style={{ color: "var(--text)" }}>Summary:</strong> Sarah asked about high volume limits and API latency. The voice receptionist clarified our cluster architecture and booked her in for Tuesday at 2 PM.
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                Duration: 142s • <Link href="/signup" style={{ color: "var(--blue)", textDecoration: "underline", fontWeight: 700 }}>View Transcript</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS SECTION ── */}
      <IntegrationsSection />

      {/* ── OUTBOUND AI DIALER SECTION ── */}
      <section id="outbound" style={{
        padding: "8rem 5%",
        background: "radial-gradient(ellipse at 0% 50%, rgba(29,78,216,0.04) 0%, transparent 60%), var(--bg)",
        borderTop: "1.5px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>

          {/* Section Header */}
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--blue-light)", border: "1.5px solid rgba(29, 78, 216, 0.15)",
              padding: "0.5rem 1.4rem", borderRadius: 99, marginBottom: "1.5rem",
              fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase" as const,
              letterSpacing: 1, color: "var(--blue)",
            }}>
              📞 Outbound AI Calling
            </div>
            <h2 style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800,
              letterSpacing: "-1.5px", lineHeight: 1.1, margin: "0 0 1.5rem", color: "var(--text)",
            }}>
              Your AI Sales Team,<br />
              <span style={{ background: "linear-gradient(135deg, var(--blue) 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Working Around the Clock
              </span>
            </h2>
            <p style={{
              fontSize: "1.15rem", fontWeight: 500, color: "var(--text-muted)",
              maxWidth: 680, margin: "0 auto", lineHeight: 1.7,
            }}>
              Stop chasing leads manually. Upload your contact list, point it at a campaign — and let your AI agent call, qualify, and book appointments on your behalf. While you sleep.
            </p>
          </div>

          {/* Two-column: left visual, right feature list */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "4rem", alignItems: "center", marginBottom: "6rem" }}>

            {/* Left — Campaign Console Mock */}
            <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.05)" }}>
              <div style={{ background: "#fff", borderBottom: "1.5px solid var(--border)", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>Campaign: Q2 Lead Blitz</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 700, color: "var(--green)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", animation: "pulseGlow 1.5s infinite", display: "inline-block" }} />
                  DIALING LIVE
                </div>
              </div>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  {[
                    { label: "Calls Placed", val: "847", color: "var(--blue)" },
                    { label: "Answered",     val: "61%",  color: "var(--green)" },
                    { label: "Booked",       val: "134",  color: "#7c3aed" },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 12, padding: "0.75rem", textAlign: "center" }}>
                      <div style={{ fontSize: "0.65rem", textTransform: "uppercase" as const, letterSpacing: 0.5, color: "var(--text-muted)", fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, marginTop: 4 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                {/* Live call log */}
                <div className="mono" style={{ background: "var(--text)", borderRadius: 14, padding: "1.2rem 1.5rem", fontSize: "0.83rem", lineHeight: 2, color: "#94a3b8" }}>
                  <div style={{ color: "#64748b", fontSize: "0.72rem", marginBottom: "0.5rem" }}>LIVE SESSION — LEAD #134</div>
                  <div><span style={{ color: "#7c3aed" }}>AI Agent:</span> Hi James, I'm calling about your interest in solar installations. Got 2 minutes?</div>
                  <div><span style={{ color: "#eff6ff" }}>Lead:</span> Sure, yeah — I did fill out a form last week.</div>
                  <div><span style={{ color: "#7c3aed" }}>AI Agent:</span> Great! I can book a free site survey — how's Thursday at 10 AM?</div>
                  <div style={{ color: "var(--green)", marginTop: "0.5rem" }}>✅ Appointment booked — synced to Google Calendar</div>
                </div>
                {/* Lead row */}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
                  {[
                    { name: "James Orton",   status: "Booked",     color: "var(--green)",  bg: "var(--green-light)" },
                    { name: "Rachel Wu",     status: "Voicemail",  color: "#d97706",       bg: "#fffbeb" },
                    { name: "Tom Bradley",   status: "Dialing…",   color: "var(--blue)",   bg: "var(--blue-light)" },
                  ].map((l) => (
                    <div key={l.name} style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 10, padding: "0.65rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>{l.name}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.72rem", background: l.bg, color: l.color, padding: "2px 10px", borderRadius: 99 }}>{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Feature bullets */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "2rem" }}>
              {[
                {
                  icon: "📋",
                  title: "Upload Any Lead List",
                  desc: "Drop in a Google Sheet, Excel file, or CSV. Your AI reads the columns, maps the data, and starts calling immediately. No formatting required.",
                },
                {
                  icon: "🧠",
                  title: "AI Qualifies Every Lead",
                  desc: "Before dialing, your AI scores each lead by interest level. Hot leads get called first. Cold leads are retried automatically on your cadence.",
                },
                {
                  icon: "🌍",
                  title: "Calls in the Right Timezone",
                  desc: "The dialer detects each lead's timezone and only calls within business hours — no annoyed prospects, no compliance issues.",
                },
                {
                  icon: "📅",
                  title: "Books Straight to Your Calendar",
                  desc: "When a lead says yes, the AI books the appointment directly into Google Calendar and sends a confirmation SMS — zero manual follow-up.",
                },
                {
                  icon: "💬",
                  title: "Smart Voicemail + SMS Follow-Up",
                  desc: "No answer? The AI drops a personalized voicemail and sends a follow-up SMS automatically. Leads come back warmed up.",
                },
              ].map((f) => (
                <div key={f.title} style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--blue-light)", border: "1.5px solid rgba(29,78,216,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", marginBottom: "0.35rem" }}>{f.title}</div>
                    <div style={{ fontSize: "0.92rem", color: "var(--text-muted)", lineHeight: 1.65 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 3-card strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            {[
              {
                badge: "Speed to Lead",
                badgeColor: "var(--green)",
                title: "Call New Leads in Under 60 Seconds",
                desc: "The moment a lead fills out your web form, your AI agent calls them — before your competitors even open their laptop. Speed-to-lead wins deals.",
              },
              {
                badge: "Retry Cadence",
                badgeColor: "var(--blue)",
                title: "Smart Retry. Never Miss a Conversion",
                desc: "Busy? Didn't answer? The system automatically retries at 2h, 24h, and 72h intervals. You configure the rules. The AI executes them perfectly — every time.",
              },
              {
                badge: "Full Analytics",
                badgeColor: "#7c3aed",
                title: "See Every Call, Transcript & Outcome",
                desc: "Every call is logged with sentiment analysis, AI summary, booking outcome, and full transcript. Know your answer rate, book rate, and ROI at a glance.",
              },
            ].map((c) => (
              <div key={c.title} style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 20, padding: "2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: 1, color: c.badgeColor, marginBottom: "1rem" }}>{c.badge}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text)", margin: "0 0 0.75rem", lineHeight: 1.35 }}>{c.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── TESTIMONIAL MARQUEE ── */}
      <div style={{ borderTop: "1.5px solid var(--border)", borderBottom: "1.5px solid var(--border)", background: "var(--surface)", padding: "4rem 0", overflow: "hidden", margin: "6rem 0" }}>
        <div style={{ display: "flex", gap: "3rem", animation: "scroll 30s linear infinite", width: "max-content" }}>
          {[1, 2, 3].map(k => (
            <div key={k} style={{ display: "flex", gap: "3rem" }}>
              {[
                { text: '"Telephony routing is perfectly crisp. We got our numbers running and configured our AI assistant in minutes."', author: "David Chen, CTO", accent: "var(--blue)" },
                { text: '"Knowledge base queries take less than a second while live on the phone. Incredible performance."', author: "Sarah J., Support Lead", accent: "var(--green)" },
                { text: '"Per-second billing structure is super transparent and fair. We only pay for active talk time."', author: "Marcus T., Operations", accent: "#7c3aed" }
              ].map((rev, idx) => (
                <div key={idx} style={{
                  background: "#fff", color: "var(--text)", border: "1.5px solid var(--border)",
                  padding: "2rem", borderRadius: 16, width: 420, flexShrink: 0,
                  borderLeft: `4px solid ${rev.accent}`, boxShadow: "0 4px 15px rgba(0,0,0,0.02)"
                }}>
                  <p style={{ fontSize: "1.02rem", fontWeight: 500, fontStyle: "italic", margin: "0 0 1.25rem", color: "var(--text)", lineHeight: 1.5 }}>
                    {rev.text}
                  </p>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", color: rev.accent, letterSpacing: 0.5 }}>
                    {rev.author}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" style={{ padding: "4rem 5%", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span className="badge" style={{ marginBottom: "1rem" }}>Pricing Plans</span>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-1.5px", color: "var(--text)", margin: "0 0 1rem" }}>
            Fair and Simple Pricing
          </h2>
          <p style={{ fontSize: "1.1rem", fontWeight: 550, color: "var(--text-muted)", margin: 0 }}>No contracts. No setup fees. Cancel anytime.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2.5rem", alignItems: "stretch" }}>
          {/* Starter Plan */}
          <div className="card" style={{ padding: "3rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fff" }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "1rem", color: "var(--text)" }}>Starter</div>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "0.5rem", lineHeight: 1, color: "var(--text)" }}>
                $50<span style={{ fontSize: "1.25rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--blue)", marginBottom: "2rem" }}>Includes 200 Minutes</div>
              
              <ul style={{ listStyle: "none", padding: 0, fontSize: "0.95rem", fontWeight: 600, textAlign: "left", margin: "2rem 0 3rem", color: "var(--text-muted)" }}>
                {["1 Active Agent", "Vector Knowledge Base", "Global Numbers (31+)", "Email Summaries", "Basic Analytics"].map(item => (
                  <li key={item} style={{ marginBottom: "1rem", display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "var(--green)", fontWeight: 800, fontSize: "1.15rem" }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup?plan=starter">
               <button className="btn-brutal white" style={{ width: "100%" }}>Choose Starter</button>
            </Link>
          </div>

          {/* Pro Business Plan */}
          <div className="card" style={{
            padding: "3rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between",
            background: "#fff", border: "2.5px solid var(--blue)", boxShadow: "0 15px 45px rgba(29, 78, 216, 0.08)",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: "1.25rem",
              right: "1.25rem",
              background: "var(--blue)",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 99,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>Popular</div>
            
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "1rem", color: "var(--blue)" }}>Pro Business</div>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "0.5rem", lineHeight: 1, color: "var(--text)" }}>
                $119<span style={{ fontSize: "1.25rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--blue)", marginBottom: "2rem" }}>Includes 500 Minutes</div>
              
              <ul style={{ listStyle: "none", padding: 0, fontSize: "0.95rem", fontWeight: 600, textAlign: "left", margin: "2rem 0 3rem", color: "var(--text-muted)" }}>
                {["2 Active Agents", "Enhanced Vector Training", "Google Calendar Sync", "HubSpot & Shopify Sync", "Call Recording & Logs"].map(item => (
                  <li key={item} style={{ marginBottom: "1rem", display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "var(--green)", fontWeight: 800, fontSize: "1.15rem" }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup?plan=pro">
               <button className="btn-brutal" style={{ width: "100%" }}>Choose Pro</button>
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="card" style={{ padding: "3rem 2rem", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#fff" }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "1rem", color: "var(--text)" }}>Premium</div>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "0.5rem", lineHeight: 1, color: "var(--text)" }}>
                $250<span style={{ fontSize: "1.25rem", color: "var(--text-muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--blue)", marginBottom: "2rem" }}>Includes 1100 Minutes</div>
              
              <ul style={{ listStyle: "none", padding: 0, fontSize: "0.95rem", fontWeight: 600, textAlign: "left", margin: "2rem 0 3rem", color: "var(--text-muted)" }}>
                {["4 Active Agents", "Custom API Integrations", "Missed Call Auto-Recovery", "Priority Routing Support", "Dedicated Success Manager"].map(item => (
                  <li key={item} style={{ marginBottom: "1rem", display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "var(--green)", fontWeight: 800, fontSize: "1.15rem" }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup?plan=premium">
               <button className="btn-brutal white" style={{ width: "100%" }}>Choose Premium</button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CLAIM NUMBER SECTION ── */}
      <ClaimNumberSection />

      {/* ── FAQ SECTION ── */}
      <section id="faq" style={{ padding: "6rem 5%", maxWidth: 850, margin: "0 auto 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span className="badge" style={{ marginBottom: "1rem" }}>Answering Help</span>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-1.5px", color: "var(--text)", margin: 0 }}>
            Frequently Asked Questions
          </h2>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {[
            { q: "What is an AI receptionist and do I need one?", a: "An AI receptionist answers your business phone calls automatically — greeting callers, answering questions, booking appointments, and escalating urgent issues to a human. If your business misses calls, pays for a full-time receptionist, or needs 24/7 coverage, an AI call answering service pays for itself immediately." },
            { q: "What is a virtual receptionist service?", a: "A virtual receptionist is a remote agent that handles your incoming calls. AIxCaller's AI virtual receptionist goes a step further — it's available 24/7 with zero hold time, costs 95% less than a human, and books appointments live during the call. It's a virtual call answering service powered by conversational AI." },
            { q: "How much does the AI phone answering service cost?", a: "Plans start at $50/month (Starter — 200 minutes, 1 agent). Pro is $119/month (500 minutes, 2 agents). Premium is $250/month (1,100 minutes, 4 agents). All plans are billed monthly with no contracts or setup fees. Compare to $3,000+/month for a human receptionist." },
            { q: "Can it automatically book appointments?", a: "Yes. AIxCaller integrates with Google Calendar. Your AI agent checks real-time availability and confirms bookings during the call — no human needed. A confirmation SMS is sent to the caller automatically." },
            { q: "Does it work with my existing phone number?", a: "Yes. Simply forward your existing business number to your AIxCaller number — no number porting required. Alternatively, provision a brand new local or toll-free number in 31+ countries from the dashboard in under 2 minutes." },
            { q: "Which industries is AIxCaller best for?", a: "Dental offices, HVAC companies, real estate agents, law firms, restaurants, plumbers, e-commerce brands, and healthcare clinics see the strongest results. Essentially any business that receives calls and cannot afford to miss them." },
            { q: "Can the AI transfer a call to a real person?", a: "Yes. You can configure your team's working hours, and AIxCaller automatically offers live transfer during business hours. Outside those hours, the AI virtual receptionist handles the call independently." },
            { q: "How is AIxCaller different from other AI caller services?", a: "AIxCaller is the only platform that combines a 24/7 AI receptionist for inbound calls with a full outbound AI sales dialer — all in one dashboard. Competitors make you buy separate tools. AIxCaller also includes native integrations with HubSpot, Shopify, Google Calendar, and Airtable at no extra cost." }
          ].map((faq, idx) => (
            <div key={idx} className="card" style={{ padding: "1.75rem 2rem", background: "#fff" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.6rem", color: "var(--text)" }}>{faq.q}</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6, fontSize: "0.95rem" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section style={{
        background: "radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.06) 0%, transparent 70%), var(--surface)",
        borderTop: "1.5px solid var(--border)",
        textAlign: "center",
        padding: "8rem 5%",
        marginTop: "4rem"
      }}>
        <h2 style={{
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
          fontWeight: 800,
          margin: "0 0 1.5rem",
          lineHeight: 1.1,
          letterSpacing: "-2px",
          color: "var(--text)"
        }}>
          Stop Missing <br />
          <span style={{
            background: "linear-gradient(135deg, var(--blue) 0%, #3b82f6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Business Calls</span>
        </h2>
        <p style={{ fontSize: "1.1rem", fontWeight: 550, color: "var(--text-muted)", marginBottom: "3rem", maxWidth: 600, margin: "0 auto 3rem", lineHeight: 1.6 }}>
          Your AI receptionist is ready to answer in under 60 seconds. No code, no contracts, no staff required.
        </p>
        <Link href="/signup">
          <button className="btn-brutal" style={{ fontSize: "1.1rem", padding: "1rem 3rem" }}>Start Answering Calls Free</button>
        </Link>
      </section>
    </main>
  );
}
