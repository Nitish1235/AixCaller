// Theme 11: COBALT — White + Cobalt Blue + Bright Yellow (Figma-inspired)
export default function CobaltTheme() {
  const cobalt = "#0047AB";
  const yellow = "#FFD700";
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#0A0A0A" }}>
      <nav style={{ background: cobalt, padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff" }}>AIxCaller<span style={{ color: yellow }}>.live</span></span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
          {["Features", "Pricing", "Enterprise"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <button style={{ background: yellow, border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 800, cursor: "pointer", color: cobalt }}>Get Started Free</button>
      </nav>
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, margin: "0 0 1.5rem" }}>
          Hire a 24/7 AI Voice Agent<br /><span style={{ color: cobalt }}>That Answers Like a Human.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#555", lineHeight: 1.7, marginBottom: "3rem", maxWidth: 520, margin: "0 auto 3rem" }}>Deploy a fully trained AI receptionist in under 5 minutes. Handles every call, qualifies leads, books appointments automatically.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button style={{ background: cobalt, color: "#fff", border: "none", borderRadius: 10, padding: "16px 34px", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}>Get Your Agent — Free</button>
          <button style={{ background: yellow, border: "none", borderRadius: 10, padding: "16px 26px", fontWeight: 800, color: cobalt, cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
      </section>
      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", padding: "0 2rem 6rem" }}>
        {[["500+", "Businesses"], ["100%", "Calls Answered"], ["<1s", "Latency"], ["30+", "Languages"]].map(([n, l]) => (
          <div key={l} style={{ background: cobalt, borderRadius: 14, padding: "2rem 2.5rem", textAlign: "center", color: "#fff", minWidth: 140 }}>
            <div style={{ fontWeight: 900, fontSize: "2rem", color: yellow }}>{n}</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <section style={{ background: "#F5F8FF", padding: "6rem 2rem", borderTop: `3px solid ${cobalt}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, textAlign: "center", marginBottom: "3rem" }}>Everything built-in. <span style={{ color: cobalt }}>Nothing to bolt on.</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {[["⚡", "Instant Setup", "Train on your data and go live in under 5 minutes."],
              ["📞", "Real Numbers", "Buy local/toll-free numbers or forward your existing ones."],
              ["🧠", "Zero Hallucinations", "AI trained exclusively on your approved documents."],
              ["🗣️", "Natural Voice", "Human-like with full context and interruption support."],
              ["📊", "Full Analytics", "Transcripts, sentiment, and live performance metrics."],
              ["🔗", "Deep Integrations", "Shopify, Calendly, Zoho, Salesforce, and 50+ more."]].map(([icon, title, desc]) => (
              <div key={title} style={{ background: "#fff", borderRadius: 14, padding: "2rem", borderTop: `4px solid ${cobalt}`, boxShadow: "0 2px 10px rgba(0,71,171,0.07)" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 6, color: cobalt }}>{title}</h3>
                <p style={{ color: "#555", fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ background: cobalt, padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>Ready to answer every call?</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: yellow, color: cobalt, border: "none", borderRadius: 10, padding: "17px 44px", fontWeight: 900, fontSize: "1.1rem", cursor: "pointer" }}>Hire Your Agent Free 🚀</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: cobalt, fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
