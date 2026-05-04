// Theme 6: ZENITH — White + Emerald + Vibrant modern SaaS (like Vercel + Supabase)
export default function ZenithTheme() {
  const green = "#10B981";
  const dark = "#064E3B";
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#111827" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #ECFDF5", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "0.9rem" }}>Ax</div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>AIxCaller<span style={{ color: green }}>.live</span></span>
        </div>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#6B7280", fontWeight: 500 }}>
          {["Features", "Pricing", "Docs", "Blog"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <button style={{ background: green, border: "none", borderRadius: 9, padding: "10px 24px", fontWeight: 700, cursor: "pointer", color: "#fff", boxShadow: `0 4px 14px ${green}55` }}>Start Free →</button>
      </nav>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "8rem 2rem 5rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 999, padding: "5px 16px", fontSize: "0.78rem", fontWeight: 700, color: dark, marginBottom: "2rem" }}>
          🟢 &nbsp;Now live — Multilingual support in 30+ languages
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2.5, margin: "0 0 1.5rem" }}>
          The AI Voice Agent<br />built for <span style={{ color: green }}>serious businesses.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#6B7280", maxWidth: 540, margin: "0 auto 3rem", lineHeight: 1.7 }}>
          Deploy a fully trained 24/7 AI receptionist in under 5 minutes. Handles calls, qualifies leads, books appointments — without you lifting a finger.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button style={{ background: green, color: "#fff", border: "none", borderRadius: 12, padding: "16px 36px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: `0 6px 24px ${green}44` }}>Get Your AI Agent — Free</button>
          <button style={{ background: "#F9FAFB", border: "1.5px solid #D1D5DB", borderRadius: 12, padding: "16px 26px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>Watch Demo ▶</button>
        </div>
        <p style={{ color: "#9CA3AF", fontSize: "0.82rem", marginTop: "1rem" }}>No credit card · 5 min setup · Cancel anytime</p>
      </section>

      {/* Feature cards with left border accent */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 2rem 8rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: -1 }}>Everything you need</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "⚡", title: "Instant Setup", desc: "Upload PDFs, website URLs, or plain text. Your agent is trained and live instantly." },
            { icon: "📞", title: "Real Phone Numbers", desc: "Buy local or toll-free numbers, or connect your existing business lines." },
            { icon: "🧠", title: "Smart Knowledge", desc: "Your AI answers accurately from your docs. Hallucination-free, every time." },
            { icon: "🗣️", title: "Natural Voice", desc: "Human-like conversation with interruption support and long-term context." },
            { icon: "📊", title: "Full Analytics", desc: "Transcripts, sentiment scoring, and real-time call performance metrics." },
            { icon: "🔗", title: "Integrations", desc: "Shopify, Calendly, Zoho, HubSpot and 50+ platforms via webhooks." },
          ].map(f => (
            <div key={f.title} style={{ background: "#FFFFFF", borderRadius: 14, padding: "1.75rem 1.75rem 1.75rem 2.25rem", border: "1px solid #E5E7EB", borderLeft: `4px solid ${green}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.95rem" }}>{f.title}</h3>
              <p style={{ color: "#6B7280", fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ background: dark, padding: "6rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1, marginBottom: "1rem" }}>Ready to answer every call?</h2>
        <p style={{ color: "#6EE7B7", marginBottom: "2.5rem", fontSize: "1.05rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: green, color: "#fff", border: "none", borderRadius: 12, padding: "17px 44px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", boxShadow: `0 6px 24px ${green}66` }}>Hire Your Agent Free 🚀</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: green, fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
