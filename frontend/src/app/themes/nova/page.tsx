// Theme 5: NOVA — White + Indigo + Electric Orange (complementary contrast)
export default function NovaTheme() {
  const orange = "#F97316";
  const indigo = "#4F46E5";
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#111827" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #F3F4F6", padding: "0 6%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: -0.5 }}>AIx<span style={{ color: indigo }}>Caller</span><span style={{ color: orange }}>.live</span></span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#6B7280", fontWeight: 500 }}>
          {["Features", "Pricing", "Enterprise", "Docs"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: "1.5px solid #E5E7EB", borderRadius: 9, padding: "9px 20px", fontWeight: 600, cursor: "pointer", color: "#6B7280" }}>Log in</button>
          <button style={{ background: indigo, border: "none", borderRadius: 9, padding: "9px 22px", fontWeight: 700, cursor: "pointer", color: "#fff" }}>Get Started</button>
        </div>
      </nav>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem 5rem", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "4rem", alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 999, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700, color: orange, marginBottom: "1.5rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />GPT-4o + Deepgram Nova-3
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 4vw, 3.8rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, margin: "0 0 1.5rem" }}>
            Your business deserves an AI agent that<br /><span style={{ color: indigo }}>never drops a call.</span>
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#6B7280", lineHeight: 1.7, marginBottom: "2.5rem" }}>Deploy a 24/7 AI voice receptionist trained on your business. Handles every call, qualifies leads, and books appointments — automatically.</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ background: `linear-gradient(135deg, ${indigo}, ${orange})`, color: "#fff", border: "none", borderRadius: 12, padding: "15px 32px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: `0 6px 24px ${indigo}44` }}>Get Your AI Agent — Free</button>
            <button style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "15px 24px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>Watch Demo ▶</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {[["⚡", "5-min Setup", indigo], ["📞", "Real Numbers", orange], ["🧠", "Trained on your data", indigo], ["📊", "Full Analytics", orange]].map(([icon, label, color]) => (
            <div key={label as string} style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: color as string }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ background: `linear-gradient(135deg, ${indigo}, ${orange})`, padding: "3rem 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem", color: "#fff" }}>
          {[["500+", "Businesses"], ["99.9%", "Uptime"], ["<1s", "Latency"], ["30+", "Languages"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}><div style={{ fontWeight: 900, fontSize: "2rem" }}>{n}</div><div style={{ opacity: 0.85, fontSize: "0.82rem" }}>{l}</div></div>
          ))}
        </div>
      </div>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 900, textAlign: "center", letterSpacing: -1, marginBottom: "3rem" }}>Everything you need to <span style={{ color: indigo }}>automate voice</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "⚡", title: "Instant Agent Setup", desc: "Train on PDFs, URLs, or text. Live in under 5 minutes.", bg: "#EEF2FF", border: "#C7D2FE" },
            { icon: "📞", title: "Real Phone Numbers", desc: "Local, toll-free, or forward your existing business line.", bg: "#FFF7ED", border: "#FED7AA" },
            { icon: "🗣️", title: "Natural Conversations", desc: "Human-like with full context, memory, and interruption.", bg: "#F0FDF4", border: "#BBF7D0" },
            { icon: "🧠", title: "Zero Hallucinations", desc: "Answers only from your approved business documents.", bg: "#FFFBEB", border: "#FDE68A" },
            { icon: "📊", title: "Analytics Dashboard", desc: "Transcripts, sentiment scores, and live call metrics.", bg: "#FFF1F2", border: "#FECDD3" },
            { icon: "🔗", title: "50+ Integrations", desc: "Shopify, Calendly, CRM, Zapier, and more out of the box.", bg: "#F5F3FF", border: "#DDD6FE" },
          ].map(f => (
            <div key={f.title} style={{ background: f.bg, border: `1.5px solid ${f.border}`, borderRadius: 16, padding: "1.75rem" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.95rem" }}>{f.title}</h3>
              <p style={{ color: "#6B7280", fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#111827", padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>Ready to answer every call?</h2>
        <p style={{ color: "#9CA3AF", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: `linear-gradient(135deg, ${indigo}, ${orange})`, color: "#fff", border: "none", borderRadius: 12, padding: "17px 44px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer" }}>Hire Your Agent Free 🚀</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: indigo, fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
