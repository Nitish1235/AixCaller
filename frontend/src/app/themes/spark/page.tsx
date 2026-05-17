// Theme 7: SPARK — White + vibrant yellow-to-orange gradient (Energetic startup)
export default function SparkTheme() {
  return (
    <div style={{ background: "#FFFBF0", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#1A1A1A" }}>
      <nav style={{ background: "#FFFBF0", borderBottom: "2px solid #FEF3C7", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: -0.5 }}>⚡ <span style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIxCaller</span>.live</span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#78716C", fontWeight: 600 }}>
          {["Features", "Pricing", "Enterprise"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <button style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 800, cursor: "pointer", color: "#fff" }}>Start Free</button>
      </nav>

      <section style={{ maxWidth: 860, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 999, padding: "5px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#B45309", marginBottom: "2rem", letterSpacing: 1, textTransform: "uppercase" }}>
          🔥 New: AI agents now support 30+ languages
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -3, margin: "0 0 1.5rem" }}>
          Stop missing calls.<br />
          <span style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Start closing more.</span>
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#78716C", maxWidth: 520, margin: "0 auto 3rem", lineHeight: 1.7 }}>
          AIxCaller deploys an AI voice agent that answers 100% of your calls, 24/7. Trained on your business data. Zero missed opportunities.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", color: "#fff", border: "none", borderRadius: 14, padding: "17px 40px", fontWeight: 900, fontSize: "1.05rem", cursor: "pointer", boxShadow: "0 8px 30px #F59E0B55" }}>Get Your AI Agent — Free →</button>
          <button style={{ background: "#fff", border: "2px solid #FDE68A", borderRadius: 14, padding: "17px 28px", fontWeight: 700, color: "#78716C", cursor: "pointer" }}>See It In Action ▶</button>
        </div>
      </section>

      {/* Big number stats */}
      <div style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", padding: "4rem 2rem", margin: "4rem 0 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem", color: "#fff" }}>
          {[["500+", "Businesses live"], ["100%", "Calls answered"], ["<4s", "Response time"], ["$0", "To get started"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}><div style={{ fontWeight: 900, fontSize: "2.5rem", letterSpacing: -1 }}>{n}</div><div style={{ opacity: 0.85, fontSize: "0.85rem", fontWeight: 600 }}>{l}</div></div>
          ))}
        </div>
      </div>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 900, textAlign: "center", marginBottom: "3rem", letterSpacing: -1 }}>Everything your business needs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {[
            { icon: "⚡", title: "5-Minute Setup", desc: "Upload your business docs, set your voice, go live. Zero technical skills needed.", num: "01" },
            { icon: "📞", title: "Real Phone Numbers", desc: "Buy local or toll-free numbers instantly, or forward your existing business line.", num: "02" },
            { icon: "🧠", title: "Trained On Your Data", desc: "Your AI knows your menu, services, prices, and FAQs. Accurate every time.", num: "03" },
            { icon: "🗣️", title: "Human-Like Voice", desc: "Natural speech with interruption support and context across the entire call.", num: "04" },
            { icon: "📊", title: "Live Analytics", desc: "Call transcripts, sentiment analysis, and performance dashboards in real time.", num: "05" },
            { icon: "🔗", title: "Deep Integrations", desc: "Shopify, Calendly, HubSpot, Zapier, Slack and 50+ more.", num: "06" },
          ].map(f => (
            <div key={f.title} style={{ background: "#FFFFFF", borderRadius: 18, padding: "2rem", border: "1px solid #FEF3C7", boxShadow: "0 2px 12px rgba(245,158,11,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2rem" }}>{f.icon}</div>
                <span style={{ fontWeight: 900, fontSize: "1.5rem", color: "#FEF3C7" }}>{f.num}</span>
              </div>
              <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: "1rem", marginTop: "1rem" }}>{f.title}</h3>
              <p style={{ color: "#78716C", fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#1A1A1A", padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>Don't lose another lead.</h2>
        <p style={{ color: "#9CA3AF", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)", color: "#fff", border: "none", borderRadius: 14, padding: "18px 48px", fontWeight: 900, fontSize: "1.15rem", cursor: "pointer" }}>Hire Your Agent Free 🔥</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: "#F59E0B", fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
