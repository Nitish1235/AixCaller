// Theme: AURORA — Soft light gray + sky blue + emerald (Friendly modern SaaS)
export default function AuroraTheme() {
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#0F172A" }}>

      {/* Nav */}
      <nav style={{ background: "rgba(248,250,252,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #0EA5E9, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🎙️</div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0F172A", letterSpacing: -0.5 }}>AIxCaller<span style={{ color: "#0EA5E9" }}>.live</span></span>
        </div>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#64748B", fontWeight: 500 }}>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Features</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Pricing</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Use Cases</a>
          <a href="#" style={{ textDecoration: "none", color: "inherit" }}>Blog</a>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "9px 20px", fontWeight: 600, cursor: "pointer", color: "#64748B" }}>Log in</button>
          <button style={{ background: "#0EA5E9", border: "none", borderRadius: 10, padding: "9px 22px", fontWeight: 700, cursor: "pointer", color: "#fff", boxShadow: "0 4px 14px rgba(14,165,233,0.35)" }}>Start Free →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 2rem 4rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 999, padding: "5px 16px", fontSize: "0.8rem", fontWeight: 700, color: "#0284C7", marginBottom: "2rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
          Trusted by 500+ businesses · &lt;1s response latency
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 5vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, margin: "0 auto 1.5rem", maxWidth: 800 }}>
          Hire a 24/7 AI Voice Agent<br />
          <span style={{ background: "linear-gradient(135deg, #0EA5E9, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            That Answers Like a Human
          </span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#64748B", maxWidth: 550, margin: "0 auto 3rem", lineHeight: 1.7 }}>
          AIxCaller provides ready-to-use AI voice agents that handle inbound & outbound calls, understand your business, and never take a day off.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ background: "linear-gradient(135deg, #0EA5E9, #10B981)", color: "#fff", border: "none", borderRadius: 14, padding: "16px 36px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 6px 24px rgba(14,165,233,0.3)" }}>
            Get Your AI Agent — Free
          </button>
          <button style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "16px 28px", fontWeight: 600, color: "#475569", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            Watch Demo ▶
          </button>
        </div>

        {/* Social proof avatars */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: "2.5rem" }}>
          <div style={{ display: "flex" }}>
            {["#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"].map((c, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: "2px solid #F8FAFC", marginLeft: i === 0 ? 0 : -10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>👤</div>
            ))}
          </div>
          <p style={{ fontSize: "0.85rem", color: "#64748B", margin: 0, fontWeight: 500 }}>
            <strong style={{ color: "#0F172A" }}>500+</strong> businesses already using AIxCaller
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 2rem 8rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {[
            { icon: "⚡", title: "Instant Agent Setup", desc: "Upload your PDFs, website URLs, or plain text. Agent is trained and live in under 5 minutes.", color: "#0EA5E9", bg: "#F0F9FF" },
            { icon: "📞", title: "Real Phone Numbers", desc: "Buy local or toll-free numbers, or connect your existing business line instantly.", color: "#10B981", bg: "#F0FDF4" },
            { icon: "🗣️", title: "Natural Conversations", desc: "Human-like voice with interruption support, contextual memory, and natural pacing.", color: "#8B5CF6", bg: "#F5F3FF" },
            { icon: "🧠", title: "Smart Knowledge Base", desc: "Your AI answers accurately from your documents only. Zero hallucinations.", color: "#F59E0B", bg: "#FFFBEB" },
            { icon: "📊", title: "Analytics Dashboard", desc: "Full call transcripts, AI-powered sentiment analysis, and real-time metrics.", color: "#EF4444", bg: "#FFF1F2" },
            { icon: "🔗", title: "Easy Integrations", desc: "Connect to Shopify, Calendly, Zoho, HubSpot, and 50+ more in one click.", color: "#06B6D4", bg: "#ECFEFF" },
          ].map(f => (
            <div key={f.title} style={{ background: "#FFFFFF", borderRadius: 20, padding: "2rem", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", transition: "all 0.2s" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1.25rem", border: `1px solid ${f.bg}` }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8, color: "#0F172A" }}>{f.title}</h3>
              <p style={{ color: "#64748B", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              <div style={{ marginTop: "1.2rem", color: f.color, fontWeight: 600, fontSize: "0.82rem" }}>Learn more →</div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section style={{ background: "#FFFFFF", padding: "6rem 2rem", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: -1, marginBottom: "4rem" }}>Go live in 3 simple steps</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3rem" }}>
            {[
              { n: "1", title: "Sign Up Free", desc: "Create your account in 30 seconds. No credit card needed." },
              { n: "2", title: "Train Your Agent", desc: "Upload your business knowledge — PDFs, URLs, or plain text." },
              { n: "3", title: "Go Live", desc: "Buy a number or forward your existing one. Done!" },
            ].map(s => (
              <div key={s.n} style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #0EA5E9, #10B981)", color: "#fff", fontWeight: 900, fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>{s.n}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "#64748B", fontSize: "0.9rem", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "8rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: -1, marginBottom: "1rem" }}>
          Ready to hire your<br />
          <span style={{ background: "linear-gradient(135deg, #0EA5E9, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ultimate AI receptionist?</span>
        </h2>
        <p style={{ color: "#64748B", marginBottom: "2.5rem", fontSize: "1.05rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: "linear-gradient(135deg, #0EA5E9, #10B981)", color: "#fff", border: "none", borderRadius: 14, padding: "18px 48px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 8px 30px rgba(14,165,233,0.3)" }}>
          Hire Your Agent Free 🚀
        </button>
        <p style={{ color: "#94A3B8", fontSize: "0.82rem", marginTop: "1rem" }}>No credit card · 5 min setup · Free trial included</p>
      </section>

      <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: "0.85rem" }}>
        <a href="/themes" style={{ color: "#0EA5E9", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a>
      </div>
    </div>
  );
}
