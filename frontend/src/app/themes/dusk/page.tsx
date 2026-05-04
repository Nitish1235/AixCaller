// Theme 10: DUSK — White + Deep Purple + Magenta (Bold, creative SaaS)
export default function DuskTheme() {
  return (
    <div style={{ background: "#FAFAFA", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#18181B" }}>
      <nav style={{ background: "#FAFAFA", borderBottom: "1px solid #F0F0F0", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: -0.5, background: "linear-gradient(135deg, #6D28D9, #DB2777)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIxCaller.live</span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#71717A", fontWeight: 500 }}>
          {["Features", "Pricing", "Blog"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <button style={{ background: "linear-gradient(135deg, #6D28D9, #DB2777)", border: "none", borderRadius: 9999, padding: "10px 24px", fontWeight: 700, cursor: "pointer", color: "#fff" }}>Get Started</button>
      </nav>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "linear-gradient(135deg, #EDE9FE, #FCE7F3)", border: "1px solid #DDD6FE", borderRadius: 999, padding: "5px 16px", fontSize: "0.8rem", fontWeight: 700, color: "#6D28D9", marginBottom: "2rem" }}>
          ✨ The AI Voice Platform Built for Growth
        </div>
        <h1 style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -3, margin: "0 0 1.5rem" }}>
          Your AI agent.<br />
          <span style={{ background: "linear-gradient(135deg, #6D28D9, #DB2777)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Always on.</span>
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#71717A", maxWidth: 540, margin: "0 auto 3rem", lineHeight: 1.7 }}>
          AIxCaller puts a trained AI voice agent on your phone line — 24/7. It handles every call, answers every question, and books every appointment.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ background: "linear-gradient(135deg, #6D28D9, #DB2777)", color: "#fff", border: "none", borderRadius: 14, padding: "17px 40px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 8px 30px #6D28D944" }}>Get Your AI Agent — Free</button>
          <button style={{ background: "#fff", border: "1.5px solid #E4E4E7", borderRadius: 14, padding: "17px 28px", fontWeight: 600, color: "#3F3F46", cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
      </section>

      {/* Bento-style feature grid */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 2rem 8rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "auto auto", gap: "1.25rem" }}>
          <div style={{ gridColumn: "1", gridRow: "1 / 3", background: "linear-gradient(135deg, #6D28D9, #DB2777)", borderRadius: 24, padding: "3rem", color: "#fff" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>🤖</div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: "1rem" }}>Instant Agent Setup</h2>
            <p style={{ fontSize: "1rem", opacity: 0.85, lineHeight: 1.6 }}>Upload your PDFs, website URLs, or paste plain text. Your AI agent is trained, voices configured, and live — in under 5 minutes. No engineering required.</p>
            <div style={{ marginTop: "2rem", background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "1rem 1.5rem", display: "inline-block" }}>
              <span style={{ fontWeight: 800 }}>5 min setup</span> · No code needed
            </div>
          </div>
          {[
            { icon: "📞", title: "Real Numbers", desc: "Buy or forward any number", bg: "#F5F3FF", color: "#6D28D9" },
            { icon: "🧠", title: "Smart AI", desc: "Trained on your exact data", bg: "#FDF2F8", color: "#DB2777" },
            { icon: "📊", title: "Analytics", desc: "Full transcripts & metrics", bg: "#F5F3FF", color: "#6D28D9" },
            { icon: "🔗", title: "Integrations", desc: "50+ platforms connected", bg: "#FDF2F8", color: "#DB2777" },
          ].map(f => (
            <div key={f.title} style={{ background: f.bg, borderRadius: 18, padding: "1.75rem", border: `1px solid ${f.color}22` }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: "1rem", color: f.color, marginBottom: 4 }}>{f.title}</h3>
              <p style={{ color: "#71717A", fontSize: "0.85rem", margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#18181B", padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>
          Ready to go <span style={{ background: "linear-gradient(135deg, #A78BFA, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>always-on?</span>
        </h2>
        <p style={{ color: "#71717A", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: "linear-gradient(135deg, #6D28D9, #DB2777)", color: "#fff", border: "none", borderRadius: 14, padding: "18px 48px", fontWeight: 800, fontSize: "1.15rem", cursor: "pointer" }}>Hire Your Agent Free ✨</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: "#6D28D9", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
