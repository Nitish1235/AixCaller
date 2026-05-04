import Link from "next/link";
import { DemoCard } from "@/components/DemoCard";

export const dynamic = "force-dynamic";
const features = [
  { icon: "⚡", title: "Instant Agent Setup", desc: "Upload your PDFs, website URLs, or plain text. Your AI agent is trained and fully live in under 5 minutes. Zero engineering required." },
  { icon: "📞", title: "Real Phone Numbers", desc: "Buy new local or toll-free numbers in 1 click, or instantly forward your existing business line to your AI agent." },
  { icon: "🧠", title: "Zero Hallucinations", desc: "Your agent answers only from your approved business documents. Accurate, consistent, and on-brand every single call." },
  { icon: "🗣️", title: "Natural Conversations", desc: "Human-like voice with full interruption support, dynamic follow-ups, and long-term context memory across the call." },
  { icon: "📊", title: "Analytics Dashboard", desc: "Full call transcripts, AI-powered sentiment analysis, lead scoring, and real-time performance metrics — all in one view." },
  { icon: "🔗", title: "Deep Integrations", desc: "Connect to Shopify, HubSpot, Calendly, Slack, Zoho, and 50+ platforms via native integrations and webhooks." },
];

const steps = [
  { n: "01", title: "Sign Up Free", desc: "Create your account in 30 seconds. No credit card required. Instant dashboard access." },
  { n: "02", title: "Train Your Agent", desc: "Upload PDFs, paste your website URL, or type plain text. Aria learns your business instantly." },
  { n: "03", title: "Connect & Go Live", desc: "Buy a new number or forward your existing line. Your AI answers calls within minutes." },
];

const useCases = [
  { icon: "🍽️", label: "Restaurants & Cafes", desc: "Handle reservations, menu inquiries, and takeout orders automatically." },
  { icon: "🩺", label: "Clinics & Doctors", desc: "Book appointments, answer FAQs, and handle after-hours inquiries." },
  { icon: "🏠", label: "Real Estate Agents", desc: "Qualify leads, schedule viewings, and answer property questions 24/7." },
  { icon: "🛒", label: "E-commerce Stores", desc: "Handle order tracking, returns, and product queries at scale." },
  { icon: "💼", label: "Service Businesses", desc: "Capture every inbound lead and book jobs automatically." },
  { icon: "📈", label: "Agencies", desc: "White-label AI agents for your clients in minutes." },
];

export default function Home() {
  return (
    <main style={{ paddingTop: 68 }}>

      {/* ── HERO ── */}
      <section style={{ background: "linear-gradient(180deg, #ECFDF5 0%, #FFFFFF 100%)", borderBottom: "1px solid #D1FAE5" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "5rem", alignItems: "center", padding: "6rem 2rem 5rem" }}>
          <div>
            <div className="badge" style={{ marginBottom: "1.5rem" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              Powered by GPT-4o + Deepgram Nova-3
            </div>
            <h1 style={{ fontSize: "clamp(2.6rem, 4.5vw, 4rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: -2, color: "#064E3B", margin: "0 0 1.5rem" }}>
              Hire a 24/7 AI Voice Agent That Answers Calls{" "}
              <span className="text-gradient">Like a Human.</span>
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#374151", lineHeight: 1.7, maxWidth: 500, marginBottom: "2.5rem" }}>
              AIxCaller.live provides ready-to-use intelligent voice agents that handle inbound & outbound calls, understand your business, and never take a day off.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "2rem" }}>
              <Link href="/signup"><button className="btn-emerald" style={{ fontSize: "1rem", padding: "14px 32px" }}>Get Your AI Agent — Free</button></Link>
              <Link href="/#how-it-works"><button className="btn-outline" style={{ fontSize: "1rem", padding: "14px 24px" }}>See How It Works ↓</button></Link>
            </div>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              {["✓ No credit card required", "✓ 5-minute setup", "✓ 99.9% uptime SLA"].map(t => (
                <span key={t} style={{ fontSize: "0.82rem", color: "#6B7280", fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Live Demo Card */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DemoCard wsUrl={process.env.NEXT_PUBLIC_VOICE_ENGINE_WS_URL || process.env.VOICE_ENGINE_URL} />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: "#064E3B", padding: "3rem 2rem" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem" }}>
          {[["500+", "Businesses"], ["100%", "Calls Answered"], ["<1s", "Response Time"], ["30+", "Languages"], ["99.9%", "Uptime SLA"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ fontWeight: 900, fontSize: "2rem", color: "#6EE7B7", letterSpacing: -1 }}>{n}</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: 2, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section className="section" id="problem">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 className="section-title">Why traditional call handling is <span className="text-gradient">failing businesses</span></h2>
            <p className="section-sub" style={{ maxWidth: 520, margin: "0.5rem auto 0" }}>Missing calls means missing revenue. See why 500+ businesses switched to AIxCaller.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div className="card" style={{ padding: "2.5rem", borderLeft: "4px solid #FCA5A5" }}>
              <h3 style={{ fontWeight: 800, color: "#DC2626", marginBottom: "1.5rem", fontSize: "1rem" }}>❌ The Old Way</h3>
              {["Calls go unanswered after business hours", "Expensive human receptionists eating margin", "Inconsistent answers from different staff", "No call transcripts or performance tracking"].map(t => (
                <div key={t} style={{ display: "flex", gap: 10, marginBottom: 12, color: "#6B7280", fontSize: "0.9rem" }}>
                  <span style={{ color: "#FCA5A5", marginTop: 2 }}>✖</span>{t}
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: "2.5rem", borderLeft: "4px solid #10B981" }}>
              <h3 style={{ fontWeight: 800, color: "#059669", marginBottom: "1.5rem", fontSize: "1rem" }}>✅ The AIxCaller Way</h3>
              {[["Answers 100% of calls 24/7 — no missed opportunities", true], ["Costs a fraction of a human receptionist", true], ["Always on-brand, trained on your exact knowledge", true], ["Full transcripts, sentiment analysis, and insights", true]].map(([t, b]) => (
                <div key={t as string} style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: "0.9rem" }}>
                  <span style={{ color: "#10B981", marginTop: 2 }}>✔</span>
                  <span style={{ color: "#374151" }}><strong>{(t as string).split(" — ")[0]}</strong>{(t as string).includes(" — ") ? ` — ${(t as string).split(" — ")[1]}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section" id="features" style={{ background: "#F6FEFA", borderTop: "1px solid #D1FAE5", borderBottom: "1px solid #D1FAE5" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 className="section-title">Everything you need to <span className="text-gradient">automate voice</span></h2>
            <p className="section-sub">Powered by Pipecat, Deepgram Nova-3, and GPT-4o for unmatched performance.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "#6B7280", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how-it-works">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 className="section-title">Deploy in <span className="text-gradient">3 Simple Steps</span></h2>
            <p className="section-sub">No technical skills required. Your AI agent can be live in under 5 minutes.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem", position: "relative" }}>
            <div style={{ position: "absolute", top: "3.5rem", left: "calc(16% + 24px)", right: "calc(16% + 24px)", height: 2, background: "linear-gradient(90deg, #10B981, #064E3B)", display: "grid", gridTemplateColumns: "1fr 1fr" }} />
            {steps.map((s, i) => (
              <div key={s.n} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #064E3B)", color: "#fff", fontWeight: 900, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", boxShadow: "0 4px 16px rgba(16,185,129,0.4)", border: "3px solid #fff" }}>{s.n}</div>
                <h3 style={{ fontWeight: 800, fontSize: "1.05rem", color: "#064E3B", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "#6B7280", fontSize: "0.88rem", lineHeight: 1.6, maxWidth: 220, margin: "0 auto" }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <Link href="/signup"><button className="btn-emerald" style={{ fontSize: "1rem", padding: "14px 36px" }}>Start For Free →</button></Link>
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="section" id="use-cases" style={{ background: "#F6FEFA", borderTop: "1px solid #D1FAE5" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h2 className="section-title">Built for <span className="text-gradient">Every Business</span></h2>
            <p className="section-sub">Whether you need 24/7 support or automated lead qualification, AIxCaller adapts to you.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {useCases.map(u => (
              <div key={u.label} className="card" style={{ padding: "1.5rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>{u.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#064E3B", marginBottom: 4, fontSize: "0.95rem" }}>{u.label}</div>
                  <div style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.5 }}>{u.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING CTA ── */}
      <section className="section" id="pricing">
        <div className="container" style={{ textAlign: "center", maxWidth: 700 }}>
          <h2 className="section-title">Simple, transparent pricing.<br />Pay only for <span className="text-gradient">what you use.</span></h2>
          <p className="section-sub" style={{ marginTop: "1rem" }}>No hidden fees. Starts at $29/month + pay-as-you-go call minutes. Scale as you grow.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: "2.5rem" }}>
            <Link href="/signup"><button className="btn-emerald" style={{ fontSize: "1rem", padding: "14px 32px" }}>View Full Pricing</button></Link>
            <Link href="/contact"><button className="btn-outline" style={{ fontSize: "1rem", padding: "14px 24px" }}>Talk to Sales</button></Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="section" id="testimonials" style={{ background: "#F6FEFA", borderTop: "1px solid #D1FAE5" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="card" style={{ padding: "3.5rem", textAlign: "center", borderTop: "4px solid #10B981" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>⭐⭐⭐⭐⭐</div>
            <p style={{ fontSize: "1.2rem", fontStyle: "italic", color: "#374151", lineHeight: 1.7, fontWeight: 500, marginBottom: "2rem" }}>
              "AIxCaller handled 400+ inbound calls last month with zero misses. Our team is finally free to focus on growth instead of picking up the phone."
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #064E3B)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>Q</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: "#064E3B" }}>James R.</div>
                <div style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>Founder, QuickFix Services</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: "linear-gradient(135deg, #064E3B, #065F46)", padding: "7rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="badge" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#6EE7B7", marginBottom: "2rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "inline-block" }} />
            Join 500+ businesses already live
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>
            Ready to hire your ultimate AI receptionist?
          </h2>
          <p style={{ color: "#6EE7B7", fontSize: "1.05rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            Start free. No credit card required. Your agent answers its first call in under 5 minutes.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup">
              <button style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 12, padding: "16px 40px", fontWeight: 800, fontSize: "1.05rem", cursor: "pointer", boxShadow: "0 6px 24px rgba(16,185,129,0.4)" }}>
                Hire Your Agent Free 🚀
              </button>
            </Link>
            <Link href="/contact">
              <button style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "16px 28px", fontWeight: 600, fontSize: "1.05rem", cursor: "pointer" }}>
                Book a Demo
              </button>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
