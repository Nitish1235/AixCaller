// Theme: PRISM — White + bold gradient color blocks (Stripe-inspired)
export default function PrismTheme() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#0A0A0A" }}>

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #F0F0F0", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: -0.5 }}>
          <span style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIxCaller</span>.live
        </span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Features</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Pricing</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Enterprise</a>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ background: "none", border: "none", fontWeight: 600, cursor: "pointer", color: "#666", padding: "9px 16px" }}>Log in</button>
          <button style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", border: "none", borderRadius: 9999, padding: "9px 22px", fontWeight: 700, cursor: "pointer", color: "#fff", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem 5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #F5F3FF, #ECFEFF)", border: "1px solid #DDD6FE", borderRadius: 999, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#7C3AED", marginBottom: "1.5rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", display: "inline-block", animation: "pulse 2s infinite" }} />
            New: Multilingual support in 30+ languages
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 4vw, 3.8rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, margin: "0 0 1.5rem", color: "#0A0A0A" }}>
            Hire a 24/7 AI<br />Voice Agent.<br />
            <span style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Never miss a call.
            </span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#555", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: 440 }}>
            Deploy intelligent voice agents that handle inbound & outbound calls, qualify leads, and book appointments — autonomously.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff", border: "none", borderRadius: 12, padding: "15px 32px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: "0 6px 24px rgba(124,58,237,0.35)" }}>
              Get Your AI Agent — Free
            </button>
            <button style={{ background: "#F8F8F8", border: "none", borderRadius: 12, padding: "15px 24px", fontWeight: 600, color: "#444", cursor: "pointer" }}>Watch Demo ▶</button>
          </div>
        </div>

        {/* Right: Feature Highlight Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { color: "linear-gradient(135deg, #7C3AED, #A855F7)", icon: "⚡", label: "Setup in < 5 minutes" },
            { color: "linear-gradient(135deg, #06B6D4, #0EA5E9)", icon: "📞", label: "Real phone numbers included" },
            { color: "linear-gradient(135deg, #10B981, #34D399)", icon: "🧠", label: "Trained on your business data" },
            { color: "linear-gradient(135deg, #F59E0B, #FCD34D)", icon: "📊", label: "Full analytics & transcripts" },
          ].map(c => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 16, background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 14, padding: "1rem 1.5rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                {c.icon}
              </div>
              <span style={{ fontWeight: 600, color: "#0A0A0A" }}>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", padding: "3rem 2rem", margin: "0 0 0 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem" }}>
          {[["500+", "Active businesses"], ["99.9%", "Uptime SLA"], ["<1s", "Response time"], ["30+", "Languages"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ fontWeight: 900, fontSize: "2rem" }}>{n}</div>
              <div style={{ opacity: 0.8, fontSize: "0.85rem", fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: -1.5, color: "#0A0A0A" }}>
            Everything you need to{" "}
            <span style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>automate voice</span>
          </h2>
          <p style={{ color: "#777", marginTop: 8 }}>Powered by Pipecat, Deepgram, and GPT-4o.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {[
            { icon: "⚡", title: "Instant Agent Setup", desc: "Upload PDFs, website URLs or plain text. Agent live in seconds.", grad: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", border: "#DDD6FE" },
            { icon: "📞", title: "Real Phone Numbers", desc: "Buy new local/toll-free numbers or forward your existing lines.", grad: "linear-gradient(135deg, #ECFEFF, #CFFAFE)", border: "#A5F3FC" },
            { icon: "🗣️", title: "Natural Conversations", desc: "Human-like voice with full interruption support and context memory.", grad: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", border: "#BBF7D0" },
            { icon: "🧠", title: "Smart Knowledge Base", desc: "Trained on your exact data. No hallucinations, just facts.", grad: "linear-gradient(135deg, #FEFCE8, #FEF9C3)", border: "#FDE047" },
            { icon: "📊", title: "Analytics Dashboard", desc: "Transcripts, sentiment analysis, and real-time call metrics.", grad: "linear-gradient(135deg, #FFF7ED, #FFEDD5)", border: "#FED7AA" },
            { icon: "🔗", title: "Easy Integrations", desc: "Shopify, Calendly, CRM systems and more via webhooks.", grad: "linear-gradient(135deg, #FDF4FF, #FAE8FF)", border: "#E9D5FF" },
          ].map(f => (
            <div key={f.title} style={{ background: f.grad, borderRadius: 18, padding: "2rem", border: `1px solid ${f.border}` }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 8, color: "#0A0A0A" }}>{f.title}</h3>
              <p style={{ color: "#555", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", overflow: "hidden", padding: "8rem 2rem", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #7C3AED15, #06B6D415)" }} />
        <h2 style={{ position: "relative", fontSize: "2.5rem", fontWeight: 900, letterSpacing: -1.5, marginBottom: "1rem" }}>
          Ready to hire your<br />
          <span style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ultimate AI receptionist?</span>
        </h2>
        <p style={{ position: "relative", color: "#666", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ position: "relative", background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff", border: "none", borderRadius: 14, padding: "18px 48px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 8px 30px rgba(124,58,237,0.35)" }}>
          Hire Your Agent Free 🚀
        </button>
      </section>

      <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: "0.85rem" }}>
        <a href="/themes" style={{ color: "#7C3AED", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a>
      </div>
    </div>
  );
}
