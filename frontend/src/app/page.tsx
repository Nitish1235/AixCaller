import Link from "next/link";
import ClaimNumberSection from "@/components/ClaimNumberSection";
import DemoCallSection from "@/components/DemoCallSection";
import IntegrationsSection from "@/components/IntegrationsSection";

export const dynamic = "force-dynamic";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://aixcaller.com/#organization",
      "name": "AIxCaller",
      "url": "https://aixcaller.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aixcaller.com/logo.svg",
        "width": 100,
        "height": 100
      },
      "description": "Automate outbound & inbound calls with intelligent AI voice agents.",
      "sameAs": ["https://twitter.com/aixcaller"]
    },
    {
      "@type": "WebSite",
      "@id": "https://aixcaller.com/#website",
      "url": "https://aixcaller.com",
      "name": "AIxCaller",
      "publisher": { "@id": "https://aixcaller.com/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://aixcaller.com/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "SoftwareApplication",
      "name": "AIxCaller",
      "operatingSystem": "Web",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "50",
        "priceCurrency": "USD"
      },
      "description": "AI-powered calling platform. Automate outbound & inbound calls with intelligent voice agents."
    },
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
            "text": "An AI receptionist is an automated phone answering service that uses voice AI to greet callers, answer questions, book appointments, and transfer calls — exactly like a human receptionist, but available 24/7. AIxCaller's AI receptionist is trained on your business documents and responds in under one second."
          }
        },
        {
          "@type": "Question",
          "name": "How much does an AI phone answering service cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AIxCaller's AI phone answering service starts at $50/month for the Starter plan (200 minutes, 1 agent). Pro is $119/month (500 minutes, 2 agents) and Premium is $250/month (1,100 minutes, 4 agents). No setup fees. Cancel anytime."
          }
        },
        {
          "@type": "Question",
          "name": "Can the AI answering service book appointments automatically?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AIxCaller connects to Google Calendar and books appointments in real-time during the call — checking availability and confirming bookings without any human involvement."
          }
        },
        {
          "@type": "Question",
          "name": "What businesses benefit most from an AI receptionist?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Dental offices, HVAC and plumbing companies, real estate agencies, law firms, restaurants, e-commerce stores, and healthcare clinics see the highest ROI. Any business that receives phone calls and wants to stop missing leads benefits from an AI receptionist."
          }
        },
        {
          "@type": "Question",
          "name": "Does AIxCaller work with my existing phone number?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. You can forward your existing business number to AIxCaller, or provision a new local or toll-free number in 31+ countries directly from the dashboard in under 2 minutes."
          }
        },
        {
          "@type": "Question",
          "name": "Can the AI receptionist transfer calls to a human?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. You can set staffed hours, and AIxCaller will transfer callers to a live team member during business hours. Outside those hours, the AI handles calls fully on its own."
          }
        },
        {
          "@type": "Question",
          "name": "Does the AI phone answering service integrate with CRM software?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AIxCaller integrates with Zoho CRM, HubSpot, Shopify, and Google Sheets. After every call, lead data is automatically synced to your CRM — no manual entry required."
          }
        }
      ]
    }
  ]
};

export default function Home() {
  return (
    <main style={{ paddingBottom: "0rem", overflowX: "hidden" }}>
      {/* JSON-LD Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── HERO ── */}
      <section style={{ textAlign: "center", paddingTop: "6rem", position: "relative", maxWidth: 1300, margin: "0 auto", padding: "6rem 5% 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 15, background: "#fff", border: "var(--border)", padding: "1rem 2rem", borderRadius: 99, boxShadow: "var(--shadow)", marginBottom: "3rem", transform: "rotate(-2deg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, height: 30 }}>
            <div style={{ width: 5, background: "var(--text)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", animationDelay: "0.1s" }} />
            <div style={{ width: 5, background: "var(--accent-green)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out" }} />
            <div style={{ width: 5, background: "var(--text)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out", animationDelay: "0.3s" }} />
            <div style={{ width: 5, background: "var(--accent-green)", borderRadius: 99, animation: "eq 0.8s infinite alternate ease-in-out" }} />
          </div>
          <span style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "1.1rem" }}>Live Telephony Engine</span>
        </div>
        
        <h1 style={{ fontSize: "clamp(3rem, 7vw, 6.5rem)", fontWeight: 900, lineHeight: 1, margin: "0 0 2rem", letterSpacing: -2, textTransform: "uppercase" }}>
          AI Receptionist<br />That Answers Every Call
        </h1>
        <p style={{ fontSize: "clamp(1.1rem, 2vw, 1.5rem)", fontWeight: 600, maxWidth: 800, margin: "0 auto 4rem", lineHeight: 1.5 }}>
          The AI phone answering service that never misses a call. Book appointments, qualify leads, answer customer questions, and sync your CRM — 24 hours a day, 7 days a week. No receptionist required.
        </p>
        
        <Link href="/signup">
          <button className="btn-brutal" style={{ fontSize: "1.4rem", padding: "1.4rem 4rem" }}>Start Building Free</button>
        </Link>
      </section>

      {/* ── HOW IT WORKS (3 STEPS) ── */}
      <section id="how-it-works" style={{ padding: "8rem 5%", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 4rem", textAlign: "center" }}>Set Up Your AI Phone Answering Service in 3 Steps</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="card" style={{ background: "var(--accent-blue)", display: "flex", alignItems: "center", gap: "3rem", transform: "rotate(-1deg)", flexWrap: "wrap" }}>
            <div style={{ fontSize: "clamp(4rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>1</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.5rem", textTransform: "uppercase", fontWeight: 900 }}>Train Your AI Receptionist</h3>
              <p style={{ fontSize: "1.2rem", margin: 0, fontWeight: 600 }}>Write your agent&apos;s personality, pick a natural-sounding AI voice, and upload your business knowledge base — FAQs, policies, pricing.</p>
            </div>
          </div>
          
          <div className="card" style={{ background: "var(--accent-pink)", display: "flex", alignItems: "center", gap: "3rem", transform: "rotate(1deg)", flexDirection: "row-reverse", flexWrap: "wrap-reverse" }}>
            <div style={{ fontSize: "clamp(4rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>2</div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <h3 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.5rem", textTransform: "uppercase", fontWeight: 900 }}>Get Your Business Phone Number</h3>
              <p style={{ fontSize: "1.2rem", margin: 0, fontWeight: 600 }}>Provision a local or toll-free number in 31+ countries, or forward your existing business number — in under 2 minutes.</p>
            </div>
          </div>
          
          <div className="card" style={{ background: "var(--accent-yellow)", display: "flex", alignItems: "center", gap: "3rem", transform: "rotate(-0.5deg)", flexWrap: "wrap" }}>
            <div style={{ fontSize: "clamp(4rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>3</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.5rem", textTransform: "uppercase", fontWeight: 900 }}>Go Live — Answer Every Call 24/7</h3>
              <p style={{ fontSize: "1.2rem", margin: 0, fontWeight: 600 }}>Your AI receptionist is active immediately. Monitor live call transcripts, sentiment scores, and minute usage from the dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO CALL ── */}
      <DemoCallSection />

      {/* ── PLATFORM ── */}
      <section id="features" style={{ padding: "8rem 5%", maxWidth: 1300, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 4rem", textAlign: "center" }}>How the AI Phone Answering Service Works</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "3rem" }}>
          
          {/* Telephony */}
          <div className="card" style={{ background: "var(--accent-pink)", gridRow: "span 2" }}>
            <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900 }}>Get a Real Business Phone Number in 2 Minutes</h3>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#475569", lineHeight: 1.5, margin: "0 0 2rem" }}>
              Provision local and toll-free numbers in 31+ countries — no telecom setup, no contracts. Pick a country and area code, and your AI receptionist starts answering calls instantly.
            </p>
            <div style={{ background: "var(--bg)", border: "2px solid var(--text)", borderRadius: 12, padding: "1.5rem", fontWeight: 700 }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1, background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  🇺🇸 United States (US) <span style={{ fontSize: "0.8rem" }}>▼</span>
                </div>
                <div className="mono" style={{ flex: 0.5, background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8 }}>Area: 415</div>
              </div>
              <div style={{ background: "#fff", marginTop: "1rem", textAlign: "center", padding: "1rem", border: "2px solid var(--text)", borderRadius: 8 }}>
                Number: <span className="mono">+1 (415) 882-9910</span>
              </div>
            </div>
          </div>
          
          {/* Knowledge Base */}
          <div className="card" style={{ background: "var(--accent-yellow)" }}>
            <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900 }}>Train Your AI Receptionist on Your Business</h3>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#475569", lineHeight: 1.5, margin: "0 0 2rem" }}>
              Upload PDFs, paste your website URL, or write your FAQs. Your AI phone agent reads your documents and answers callers accurately — every time.
            </p>
            <div style={{ background: "rgba(255,255,255,0.5)", border: "2px dashed var(--text)", borderRadius: 12, padding: "2rem", textAlign: "center", fontWeight: 700 }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>📄</div>
              Drop PDF files here or paste URL<br />
              <div className="mono" style={{ display: "inline-block", background: "var(--text)", color: "#fff", padding: "0.4rem 1rem", borderRadius: 99, fontSize: "0.8rem", marginTop: 10 }}>Processing document...</div>
            </div>
          </div>
          
          {/* Marketplace */}
          <div className="card">
            <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900 }}>Ready-to-Use AI Receptionist Templates</h3>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#475569", lineHeight: 1.5, margin: "0 0 2rem" }}>
              Skip the setup. Launch a pre-configured AI receptionist built for your industry — dental, real estate, HVAC, law, and more. One click and you're live.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Link href="/use-cases/dental-receptionist-ai" style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8, textAlign: "center", fontWeight: 700, color: "var(--text)" }}>🦷 Dental Desk</div>
              </Link>
              <Link href="/use-cases/real-estate-ai-voice-agent" style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "2px solid var(--text)", padding: "1rem", borderRadius: 8, textAlign: "center", fontWeight: 700, color: "var(--text)" }}>🏠 Realtor Bot</div>
              </Link>
            </div>
          </div>
          
          {/* Email Summaries */}
          <div className="card" style={{ background: "var(--text)", color: "#fff", gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "center" }}>
            <div style={{ flex: "1 1 400px" }}>
              <h3 style={{ fontSize: "2.5rem", textTransform: "uppercase", margin: "0 0 1rem", lineHeight: 1.1, fontWeight: 900, color: "var(--accent-green)" }}>Receive Instant Post-Call Analytics</h3>
              <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 2rem" }}>
                You don't even need to log into our dashboard. The second a call finishes, the AI emails you the customer's intent, a brief summary of the conversation, and the full transcript.
              </p>
            </div>
            <div className="mono" style={{ flex: "1 1 350px", background: "#1e293b", border: "2px solid #334155", borderRadius: 12, padding: "1.5rem", fontWeight: 700, boxShadow: "8px 8px 0 var(--accent-pink)", transform: "rotate(1deg)" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>FROM: agent@callerx.ai</span>
                <span>1 min ago</span>
              </div>
              <div style={{ color: "#fff", fontSize: "1.1rem", marginBottom: "1rem", borderBottom: "2px solid #334155", paddingBottom: "1rem" }}>
                SUBJECT: New Lead - Sarah Jenkins
              </div>
              <div style={{ color: "var(--accent-green)", marginBottom: "0.8rem", fontSize: "0.95rem" }}>
                ✅ Goal Achieved: Appointment Booked
              </div>
              <div style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, paddingBottom: "1rem", borderBottom: "2px solid #334155", marginBottom: "1rem" }}>
                <strong style={{ color: "#fff" }}>Summary:</strong> Sarah called asking about the Pro plan. She had questions regarding call latency. The agent explained our proprietary architecture and successfully booked a demo for Tuesday at 2 PM.
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                Duration: 142s • <Link href="/signup" style={{ color: "inherit" }}><span style={{ textDecoration: "underline", cursor: "pointer" }}>View Full Transcript</span></Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <IntegrationsSection />



      {/* ── REVIEWS MARQUEE ── */}
      <div style={{ borderTop: "var(--border)", borderBottom: "var(--border)", background: "var(--text)", padding: "3rem 0", overflow: "hidden", margin: "8rem 0" }}>
        <div style={{ display: "flex", gap: "3rem", animation: "scroll 30s linear infinite", width: "max-content" }}>
          {[1,2,3].map(k => (
            <div key={k} style={{ display: "flex", gap: "3rem" }}>
              <div style={{ background: "#fff", color: "var(--text)", border: "var(--border)", padding: "2rem", borderRadius: 16, width: "clamp(280px, 40vw, 450px)", boxShadow: "6px 6px 0 var(--accent-green)", flexShrink: 0 }}>
                <p style={{ fontSize: "clamp(1rem, 2vw, 1.3rem)", fontWeight: 700, fontStyle: "italic", margin: "0 0 1rem" }}>"The telephony integration is seamless. We provisioned 5 UK numbers and 3 US numbers in about two minutes."</p>
                <div style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>— David Chen, CTO</div>
              </div>
              <div style={{ background: "#fff", color: "var(--text)", border: "var(--border)", padding: "2rem", borderRadius: 16, width: "clamp(280px, 40vw, 450px)", boxShadow: "6px 6px 0 var(--accent-pink)", flexShrink: 0 }}>
                <p style={{ fontSize: "clamp(1rem, 2vw, 1.3rem)", fontWeight: 700, fontStyle: "italic", margin: "0 0 1rem" }}>"Knowledge retrieval is incredibly fast. The agent reads from our 50-page PDF policy manual in under a second while on the phone."</p>
                <div style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>— Sarah J., Support Lead</div>
              </div>
              <div style={{ background: "#fff", color: "var(--text)", border: "var(--border)", padding: "2rem", borderRadius: 16, width: "clamp(280px, 40vw, 450px)", boxShadow: "6px 6px 0 var(--accent-yellow)", flexShrink: 0 }}>
                <p style={{ fontSize: "clamp(1rem, 2vw, 1.3rem)", fontWeight: 700, fontStyle: "italic", margin: "0 0 1rem" }}>"Per-second billing makes this a no-brainer. We only pay exactly for what we use."</p>
                <div style={{ fontSize: "1rem", fontWeight: 900, textTransform: "uppercase" }}>— Marcus T., Operations</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "4rem 5%", maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 1rem", textAlign: "center" }}>AI Receptionist Pricing</h2>
        <p style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 600, color: "#64748b", marginBottom: "3rem" }}>No contracts. No setup fees. Cancel anytime.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", alignItems: "start", width: "100%", padding: "1rem 0" }}>
          
          <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", flex: 1, minWidth: "300px" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>Starter</div>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, marginBottom: "1rem", lineHeight: 1 }}>$50<span style={{ fontSize: "1.5rem", color: "#64748b" }}>/mo</span></div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#64748b", marginBottom: "2rem" }}>Includes 200 Minutes</div>
            
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1rem", fontWeight: 700, textAlign: "left", margin: "2rem 0 3rem" }}>
              {["2 Active Agents", "Vector Knowledge Base", "Global Numbers (31+)", "Marketplace Access"].map(item => (
                <li key={item} style={{ marginBottom: "1.2rem", display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900, fontSize: "1.4rem" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=starter">
               <button className="btn-brutal white" style={{ width: "100%" }}>Choose Starter</button>
            </Link>
          </div>
          
          <div className="card" style={{ padding: "3rem 2rem", textAlign: "center", background: "var(--text)", color: "#fff", borderColor: "#fff", boxShadow: "12px 12px 0 var(--accent-green)", zIndex: 10, flex: 1, minWidth: "280px" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem", color: "var(--accent-green)" }}>Pro Business</div>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, marginBottom: "1rem", lineHeight: 1 }}>$119<span style={{ fontSize: "1.5rem", color: "#94a3b8" }}>/mo</span></div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#94a3b8", marginBottom: "2rem" }}>Includes 500 Minutes</div>
            
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1rem", fontWeight: 700, textAlign: "left", margin: "2rem 0 3rem" }}>
              {["2 Active Agents", "Vector Knowledge Base", "Global Numbers (31+)", "Marketplace Access"].map(item => (
                <li key={item} style={{ marginBottom: "1.2rem", display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900, fontSize: "1.4rem" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=pro">
               <button className="btn-brutal" style={{ width: "100%", boxShadow: "4px 4px 0 #fff" }}>Choose Pro</button>
            </Link>
          </div>

          <div className="card" style={{ padding: "4rem 2rem", textAlign: "center", flex: 1, minWidth: "300px" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>Premium</div>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, marginBottom: "1rem", lineHeight: 1 }}>$250<span style={{ fontSize: "1.5rem", color: "#64748b" }}>/mo</span></div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#64748b", marginBottom: "2rem" }}>Includes 1100 Minutes</div>
            
            <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1rem", fontWeight: 700, textAlign: "left", margin: "2rem 0 3rem" }}>
              {["4 Active Agents", "Vector Knowledge Base", "Global Numbers (31+)", "Missed Call Recovery"].map(item => (
                <li key={item} style={{ marginBottom: "1.2rem", display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900, fontSize: "1.4rem" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup?plan=premium">
               <button className="btn-brutal white" style={{ width: "100%" }}>Go Premium</button>
            </Link>
          </div>

        </div>
      </section>
      


      {/* ── CLAIM NUMBER ── */}
      <ClaimNumberSection />

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "4rem 5%", maxWidth: 800, margin: "0 auto 4rem" }}>
        <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: "0 0 3rem", textAlign: "center" }}>AI Receptionist FAQ</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 0.5rem" }}>What is an AI receptionist and do I need one?</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>An AI receptionist answers your business phone calls automatically — greeting callers, answering questions, booking appointments, and escalating urgent issues to a human. If your business misses calls, pays for a full-time receptionist, or needs 24/7 coverage, an AI answering service pays for itself immediately.</p>
          </div>
          
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 0.5rem" }}>How much does the AI phone answering service cost?</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>Plans start at $50/month (Starter — 200 minutes, 1 agent). Pro is $119/month (500 minutes, 2 agents). Premium is $250/month (1,100 minutes, 4 agents). All plans are billed monthly with no contracts or setup fees.</p>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 0.5rem" }}>Can it automatically book appointments?</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>Yes. AIxCaller integrates with Google Calendar. Your AI agent checks real-time availability and confirms bookings during the call — no human needed.</p>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 0.5rem" }}>Does it work with my existing phone number?</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>Yes. Simply forward your existing business number to your AIxCaller number — no number porting required. Alternatively, provision a brand new local or toll-free number in 31+ countries from the dashboard in under 2 minutes.</p>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 0.5rem" }}>Which industries is AIxCaller best for?</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>Dental offices, HVAC companies, real estate agents, law firms, restaurants, plumbers, e-commerce brands, and healthcare clinics see the strongest results. Essentially any business that receives calls and cannot afford to miss them.</p>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0 0 0.5rem" }}>Can the AI transfer a call to a real person?</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>Yes. You can configure your team's working hours, and AIxCaller automatically offers live transfer during business hours. Outside those hours, the AI handles the call independently.</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <footer style={{ background: "var(--accent-green)", borderTop: "var(--border)", textAlign: "center", padding: "8rem 5%", marginTop: "6rem" }}>
        <h2 style={{ fontSize: "clamp(3.5rem, 6vw, 6rem)", fontWeight: 900, textTransform: "uppercase", margin: "0 0 1.5rem", lineHeight: 1, letterSpacing: -2 }}>
          Stop Missing <br />Business Calls
        </h2>
        <p style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "3rem", opacity: 0.85, maxWidth: 600, margin: "0 auto 3rem" }}>Your AI receptionist is ready to answer in under 60 seconds. No code, no contracts, no staff required.</p>
        <Link href="/signup">
          <button className="btn-brutal white" style={{ fontSize: "1.5rem", padding: "1.5rem 4rem" }}>Start Answering Calls Free</button>
        </Link>
      </footer>
    </main>
  );
}
