// Theme 13: MINT — Clean white + mint green + fresh modern SaaS
export default function MintTheme() {
  const mint = "#10D9A0";
  const dark = "#0A2E1E";
  return (
    <div style={{ background: "#F6FEFA", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#0A2E1E" }}>
      <nav style={{ background: "#F6FEFA", borderBottom: "1px solid #D1FAE5", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: mint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🎙️</div>
          <span style={{ fontWeight: 900, fontSize: "1.1rem", color: dark }}>AIxCaller<span style={{ color: mint }}>.live</span></span>
        </div>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#065F46", fontWeight: 500 }}>
          {["Features", "Pricing", "Blog"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <button style={{ background: dark, border: "none", borderRadius: 9, padding: "10px 22px", fontWeight: 700, cursor: "pointer", color: "#fff" }}>Start Free →</button>
      </nav>
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 999, padding: "5px 16px", fontSize: "0.78rem", fontWeight: 700, color: "#065F46", marginBottom: "2rem" }}>
          🟢 Live · Trusted by 500+ businesses
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2.5, margin: "0 0 1.5rem", color: dark }}>
          Your calls, handled.<br /><span style={{ color: mint }}>Your leads, captured.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#065F46", maxWidth: 520, margin: "0 auto 3rem", lineHeight: 1.7, opacity: 0.8 }}>Deploy a 24/7 AI voice agent trained on your business in under 5 minutes. Never miss another call or opportunity again.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button style={{ background: mint, color: dark, border: "none", borderRadius: 12, padding: "16px 36px", fontWeight: 900, fontSize: "1rem", cursor: "pointer", boxShadow: `0 6px 24px ${mint}66` }}>Get Your Agent — Free</button>
          <button style={{ background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 12, padding: "16px 26px", fontWeight: 600, color: dark, cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
      </section>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 2rem 8rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {[["⚡", "Instant Setup", "Upload your data and go live in under 5 minutes."],
            ["📞", "Real Numbers", "Buy local/toll-free or forward your existing lines."],
            ["🧠", "Smart AI", "Trained only on your docs. Zero hallucinations."],
            ["🗣️", "Natural Voice", "Human-like with context memory and interruptions."],
            ["📊", "Analytics", "Transcripts, sentiment scores, and live metrics."],
            ["🔗", "Integrations", "Shopify, Calendly, CRM and 50+ more platforms."]].map(([icon, title, desc]) => (
            <div key={title} style={{ background: "#FFFFFF", borderRadius: 18, padding: "2rem", border: "1px solid #D1FAE5", boxShadow: `0 2px 12px ${mint}22` }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: "1rem" }}>{icon}</div>
              <h3 style={{ fontWeight: 800, marginBottom: 6, fontSize: "0.95rem", color: dark }}>{title}</h3>
              <p style={{ color: "#065F46", fontSize: "0.87rem", lineHeight: 1.5, margin: 0, opacity: 0.75 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ background: dark, padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>Ready to answer every call?</h2>
        <p style={{ color: mint, marginBottom: "2.5rem", opacity: 0.8 }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: mint, color: dark, border: "none", borderRadius: 12, padding: "17px 44px", fontWeight: 900, fontSize: "1.1rem", cursor: "pointer" }}>Hire Your Agent Free 🚀</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: mint, fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
