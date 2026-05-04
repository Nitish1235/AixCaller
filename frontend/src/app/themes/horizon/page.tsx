// Theme 12: HORIZON — White + Rose + Violet gradient (Romantic modern)
export default function HorizonTheme() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#18181B" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #FDF2F8", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", background: "linear-gradient(135deg, #E11D48, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIxCaller.live</span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#71717A", fontWeight: 500 }}>
          {["Features", "Pricing", "Blog"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <button style={{ background: "linear-gradient(135deg, #E11D48, #7C3AED)", border: "none", borderRadius: 9999, padding: "10px 24px", fontWeight: 700, cursor: "pointer", color: "#fff" }}>Start Free</button>
      </nav>
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "linear-gradient(135deg, #FFF1F2, #F5F3FF)", border: "1px solid #FECDD3", borderRadius: 999, padding: "5px 16px", fontSize: "0.78rem", fontWeight: 700, color: "#E11D48", marginBottom: "2rem" }}>
          ✦ The AI Voice Platform Built for Growth
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -2.5, margin: "0 0 1.5rem" }}>
          Every call answered.<br />
          <span style={{ background: "linear-gradient(135deg, #E11D48, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Every lead captured.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#71717A", maxWidth: 520, margin: "0 auto 3rem", lineHeight: 1.7 }}>A 24/7 AI voice agent that knows your business, handles your calls, and never takes a day off — live in under 5 minutes.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button style={{ background: "linear-gradient(135deg, #E11D48, #7C3AED)", color: "#fff", border: "none", borderRadius: 14, padding: "17px 40px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 8px 30px #E11D4844" }}>Get Your AI Agent — Free</button>
          <button style={{ background: "#F4F4F5", border: "none", borderRadius: 14, padding: "17px 28px", fontWeight: 600, color: "#3F3F46", cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
      </section>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 8rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "⚡", title: "Instant Setup", desc: "Upload your data and go live in under 5 minutes.", grad: "linear-gradient(135deg, #FFF1F2, #FDF2F8)" },
            { icon: "📞", title: "Real Numbers", desc: "Buy local/toll-free or forward your existing lines.", grad: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" },
            { icon: "🧠", title: "Smart AI", desc: "Trained on your docs. Accurate every time.", grad: "linear-gradient(135deg, #FFF1F2, #FDF2F8)" },
            { icon: "🗣️", title: "Natural Voice", desc: "Human-like with context memory and interruptions.", grad: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" },
            { icon: "📊", title: "Analytics", desc: "Transcripts, sentiment scores, and live metrics.", grad: "linear-gradient(135deg, #FFF1F2, #FDF2F8)" },
            { icon: "🔗", title: "Integrations", desc: "Shopify, Calendly, CRM and 50+ more.", grad: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" },
          ].map(f => (
            <div key={f.title} style={{ background: f.grad, borderRadius: 20, padding: "2rem", border: "1px solid #FCE7F3" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, marginBottom: 6, fontSize: "0.95rem" }}>{f.title}</h3>
              <p style={{ color: "#71717A", fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ background: "linear-gradient(135deg, #E11D48, #7C3AED)", padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>Ready to hire your AI receptionist?</h2>
        <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: "#fff", color: "#E11D48", border: "none", borderRadius: 14, padding: "17px 44px", fontWeight: 900, fontSize: "1.1rem", cursor: "pointer" }}>Hire Your Agent Free ✦</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: "#E11D48", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
