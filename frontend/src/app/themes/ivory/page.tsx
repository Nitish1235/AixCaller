// Theme: IVORY — Warm off-white + amber gold (Premium luxury SaaS)
export default function IvoryTheme() {
  return (
    <div style={{ background: "#FAFAF7", minHeight: "100vh", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#1C1C1E" }}>

      {/* Nav */}
      <nav style={{ background: "#FAFAF7", borderBottom: "1px solid #E8E4DC", padding: "0 6%", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "1.3rem", color: "#1C1C1E", fontFamily: "Georgia, serif", letterSpacing: 0.5 }}>
          AIxCaller<span style={{ color: "#D97706" }}>.</span>live
        </span>
        <div style={{ display: "flex", gap: "2.5rem", fontSize: "0.9rem", color: "#6B6B6B", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Features</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Use Cases</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Pricing</a>
        </div>
        <div style={{ display: "flex", gap: 12, fontFamily: "'Inter', sans-serif" }}>
          <button style={{ background: "none", border: "1px solid #D4C9B8", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer", color: "#6B6B6B" }}>Log in</button>
          <button style={{ background: "#D97706", border: "none", borderRadius: 6, padding: "9px 20px", fontWeight: 600, cursor: "pointer", color: "#fff" }}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 700, letterSpacing: 3, color: "#D97706", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          AI Voice Platform
        </p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: -1, color: "#1C1C1E", margin: "0 0 1.5rem" }}>
          An AI agent that answers your calls,{" "}
          <em style={{ color: "#D97706", fontStyle: "italic" }}>exactly like you would.</em>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#6B6B6B", maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
          Stop missing calls. Deploy a trained AI voice receptionist that knows your business inside out — 24 hours a day, 7 days a week.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", fontFamily: "'Inter', sans-serif" }}>
          <button style={{ background: "#1C1C1E", color: "#FAFAF7", border: "none", borderRadius: 8, padding: "15px 36px", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
            Start For Free →
          </button>
          <button style={{ background: "none", border: "1px solid #D4C9B8", borderRadius: 8, padding: "15px 28px", fontWeight: 600, color: "#6B6B6B", cursor: "pointer" }}>
            Watch Demo
          </button>
        </div>
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", marginTop: "2rem", fontFamily: "'Inter', sans-serif" }}>
          {["✓ No credit card", "✓ 5-min setup", "✓ Free trial"].map(t => (
            <span key={t} style={{ fontSize: "0.8rem", color: "#9CA3AF", fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </section>

      {/* Divider with ornament */}
      <div style={{ textAlign: "center", color: "#D4C9B8", fontSize: "1.5rem", letterSpacing: 8, margin: "0 0 5rem" }}>· · ·</div>

      {/* Features */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 2rem 7rem" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 700, textAlign: "center", marginBottom: "4rem", color: "#1C1C1E" }}>
          Everything your business needs
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
          {[
            { icon: "⚡", title: "Instant Setup", desc: "Your agent is trained and live from your documents in under 5 minutes." },
            { icon: "📞", title: "Real Numbers", desc: "Buy local or toll-free numbers, or connect your existing lines." },
            { icon: "🧠", title: "Always Accurate", desc: "AI trained on your exact business knowledge. No hallucinations." },
            { icon: "📊", title: "Rich Analytics", desc: "Call transcripts, sentiment scores, and performance dashboards." },
            { icon: "🔗", title: "Integrations", desc: "Shopify, Zoho, HubSpot, Calendly and 50+ more via webhooks." },
            { icon: "🌍", title: "Multilingual", desc: "Serve global customers in 30+ languages, naturally." },
          ].map(f => (
            <div key={f.title} style={{ background: "#FFFFFF", borderRadius: 12, padding: "2rem", border: "1px solid #EDE9E1", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{f.icon}</div>
              <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: 8, color: "#1C1C1E" }}>{f.title}</h3>
              <p style={{ color: "#6B6B6B", fontSize: "0.9rem", lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote / Social proof */}
      <section style={{ background: "#1C1C1E", padding: "6rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: "3rem", color: "#D97706", fontFamily: "Georgia, serif", lineHeight: 0.8, marginBottom: "1.5rem" }}>"</div>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#F5F5F5", lineHeight: 1.6, fontStyle: "italic", marginBottom: "2rem" }}>
            AIxCaller handled 400+ calls last month. Our team can finally focus on growth instead of picking up the phone.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#9CA3AF", fontWeight: 600 }}>— FOUNDER, QUICKFIX SERVICES</p>
          <button style={{ marginTop: "3rem", background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "16px 40px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Hire Your Agent Free
          </button>
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: "0.85rem", fontFamily: "'Inter', sans-serif" }}>
        <a href="/themes" style={{ color: "#D97706", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a>
      </div>
    </div>
  );
}
