// Theme 8: GLACIER — White + Icy Blue + Silver (Apple-inspired clean)
export default function GlacierTheme() {
  const blue = "#0099FF";
  const silver = "#64748B";
  return (
    <div style={{ background: "#F8FAFE", minHeight: "100vh", fontFamily: "-apple-system, 'SF Pro Display', 'Inter', sans-serif", color: "#1D1D1F" }}>
      <nav style={{ background: "rgba(248,250,254,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "0 6%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 700, fontSize: "1.15rem", color: "#1D1D1F", letterSpacing: -0.3 }}>AIxCaller<span style={{ color: blue }}>.live</span></span>
        <div style={{ display: "flex", gap: "2.5rem", fontSize: "0.88rem", color: "#6E6E73", fontWeight: 500 }}>
          {["Features", "Enterprise", "Pricing", "Support"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: "none", fontWeight: 600, cursor: "pointer", color: blue, fontSize: "0.9rem" }}>Log in</button>
          <button style={{ background: blue, border: "none", borderRadius: 980, padding: "9px 22px", fontWeight: 600, cursor: "pointer", color: "#fff", fontSize: "0.9rem" }}>Get Started</button>
        </div>
      </nav>

      <section style={{ maxWidth: 760, margin: "0 auto", padding: "9rem 2rem 5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: 2, color: blue, textTransform: "uppercase", marginBottom: "1.5rem" }}>Introducing AIxCaller v2</p>
        <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: -2.5, margin: "0 0 1.5rem", color: "#1D1D1F" }}>
          Every call handled.<br />Every lead captured.
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#6E6E73", maxWidth: 480, margin: "0 auto 3rem", lineHeight: 1.65 }}>
          A new era in business communications. AI-powered voice agents that are indistinguishable from your best team member.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button style={{ background: blue, color: "#fff", border: "none", borderRadius: 12, padding: "15px 34px", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}>Get Your AI Agent</button>
          <button style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 12, padding: "15px 28px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
      </section>

      {/* Glass feature row */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 8rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {[
            { icon: "⚡", title: "Instant Setup", desc: "Train on your business data and go live in under 5 minutes." },
            { icon: "📞", title: "Real Numbers", desc: "Buy local or toll-free numbers, or forward your existing line." },
            { icon: "🧠", title: "AI Knowledge", desc: "Fully trained on your documents. Accurate, reliable, always on." },
            { icon: "🗣️", title: "Natural Voice", desc: "Lifelike conversation with interruption support and full context." },
            { icon: "📊", title: "Smart Analytics", desc: "Full transcripts, sentiment analysis, and performance metrics." },
            { icon: "🔗", title: "Integrations", desc: "Connect to Shopify, CRM, Calendly, and 50+ more platforms." },
          ].map(f => (
            <div key={f.title} style={{ background: "#FFFFFF", borderRadius: 18, padding: "2rem", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,153,255,0.06)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EFF8FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: "1.2rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 8, color: "#1D1D1F" }}>{f.title}</h3>
              <p style={{ color: "#6E6E73", fontSize: "0.87rem", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#1D1D1F", padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>The future of business calls.</h2>
        <p style={{ color: "#6E6E73", marginBottom: "2.5rem", fontSize: "1.05rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: blue, color: "#fff", border: "none", borderRadius: 12, padding: "17px 42px", fontWeight: 600, fontSize: "1.05rem", cursor: "pointer" }}>Start For Free</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: blue, fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
