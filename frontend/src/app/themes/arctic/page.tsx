// Theme: ARCTIC — Clean white + electric blue (Linear / Vercel style)
export default function ArcticTheme() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#0F172A" }}>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0", padding: "0 5%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", color: "#0F172A", letterSpacing: -0.5 }}>AIxCaller<span style={{ color: "#2563EB" }}>.live</span></span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem", color: "#475569", fontWeight: 500 }}>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Features</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Pricing</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Docs</a>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer", color: "#475569" }}>Log in</button>
          <button style={{ background: "#2563EB", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer", color: "#fff", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>Get Started →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "7rem 2rem 5rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#1D4ED8", marginBottom: "1.5rem" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
          Live AI agents · Under 5 min setup
        </div>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, margin: "0 0 1.5rem" }}>
          The AI voice agent that<br />
          <span style={{ color: "#2563EB" }}>answers every call.</span>
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#64748B", maxWidth: 560, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
          Deploy a 24/7 AI receptionist in minutes. Handles inbound calls, qualifies leads, books appointments — without lifting a finger.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}>Get Your AI Agent — Free</button>
          <button style={{ background: "none", border: "1px solid #CBD5E1", borderRadius: 10, padding: "14px 28px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "1rem" }}>No credit card required · Setup in &lt; 5 min</p>
      </section>

      {/* Stats bar */}
      <div style={{ borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "1rem" }}>
          {[["500+", "Businesses"], ["99.9%", "Uptime SLA"], ["<1s", "Response latency"], ["24/7", "Always-on coverage"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "#0F172A" }}>{n}</div>
              <div style={{ fontSize: "0.8rem", color: "#94A3B8", fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: -1, color: "#0F172A" }}>Everything you need, nothing you don't.</h2>
          <p style={{ color: "#64748B", marginTop: 8 }}>Powerful AI features built for modern businesses.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {[
            { icon: "⚡", title: "Instant Agent Setup", desc: "Upload your PDFs or website URL. Your agent is trained and live in under 5 minutes.", color: "#EFF6FF" },
            { icon: "📞", title: "Real Phone Numbers", desc: "Buy local or toll-free numbers, or forward your existing business lines instantly.", color: "#F0FDF4" },
            { icon: "🧠", title: "Smart Knowledge Base", desc: "Answers from your documents. Accurate, hallucination-free responses every time.", color: "#FEF9C3" },
            { icon: "📊", title: "Analytics Dashboard", desc: "Full transcripts, sentiment analysis, and call performance metrics at a glance.", color: "#FFF7ED" },
            { icon: "🔗", title: "Native Integrations", desc: "Connect with Shopify, CRM tools, Calendly, and any platform via webhooks.", color: "#F5F3FF" },
            { icon: "🌍", title: "Multilingual Support", desc: "Serve customers in 30+ languages with natural, accent-aware voice synthesis.", color: "#FFF1F2" },
          ].map(f => (
            <div key={f.title} style={{ background: f.color, borderRadius: 16, padding: "2rem", border: "1px solid #E2E8F0", transition: "all 0.2s" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8, color: "#0F172A" }}>{f.title}</h3>
              <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#0F172A", margin: "0 2rem 4rem", borderRadius: 24, padding: "5rem 2rem", textAlign: "center", maxWidth: 1060, marginLeft: "auto", marginRight: "auto" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1, margin: "0 0 1rem" }}>Ready to answer every call?</h2>
        <p style={{ color: "#94A3B8", marginBottom: "2rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, padding: "16px 40px", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.4)" }}>Hire Your Agent Free 🚀</button>
      </section>

      <div style={{ textAlign: "center", padding: "2rem", color: "#CBD5E1", fontSize: "0.85rem" }}>
        <a href="/themes" style={{ color: "#2563EB", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a>
      </div>
    </div>
  );
}
