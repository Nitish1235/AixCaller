// Theme 9: STEEL — White + Steel Blue + Electric Teal (Enterprise SaaS)
export default function SteelTheme() {
  const teal = "#0D9488";
  const steel = "#1E40AF";
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#0F172A" }}>
      <nav style={{ background: "#fff", borderBottom: "2px solid #F1F5F9", padding: "0 6%", height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontWeight: 900, fontSize: "1.25rem", letterSpacing: -0.5 }}><span style={{ color: steel }}>AIx</span><span style={{ color: teal }}>Caller</span>.live</span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.88rem", color: "#475569", fontWeight: 500 }}>
          {["Product", "Solutions", "Pricing", "Enterprise"].map(l => <a key={l} href="#" style={{ textDecoration: "none", color: "inherit" }}>{l}</a>)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: "1.5px solid #CBD5E1", borderRadius: 8, padding: "9px 20px", fontWeight: 600, cursor: "pointer", color: "#475569" }}>Log in</button>
          <button style={{ background: `linear-gradient(135deg, ${steel}, ${teal})`, border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 700, cursor: "pointer", color: "#fff" }}>Request Demo</button>
        </div>
      </nav>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "7rem 2rem 5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-block", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700, color: steel, marginBottom: "1.5rem", letterSpacing: 0.5 }}>
            ENTERPRISE AI VOICE PLATFORM
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 4vw, 3.6rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5, margin: "0 0 1.5rem" }}>
            AI voice agents built for<br /><span style={{ background: `linear-gradient(135deg, ${steel}, ${teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>enterprise scale.</span>
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#475569", lineHeight: 1.7, marginBottom: "2.5rem" }}>Deploy intelligent voice agents that handle thousands of concurrent calls. SOC2 compliant. 99.9% uptime SLA. Built for teams that can't afford downtime.</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ background: `linear-gradient(135deg, ${steel}, ${teal})`, color: "#fff", border: "none", borderRadius: 10, padding: "15px 32px", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>Get Your AI Agent — Free</button>
            <button style={{ background: "none", border: "1.5px solid #CBD5E1", borderRadius: 10, padding: "15px 24px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>Book a Demo</button>
          </div>
          <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
            {[["SOC2", "Compliant"], ["99.9%", "Uptime SLA"], ["24/7", "Support"]].map(([n, l]) => (
              <div key={l}><span style={{ fontWeight: 800, color: teal }}>{n}</span><br /><span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{l}</span></div>
            ))}
          </div>
        </div>
        {/* Right: Metric cards */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {[["📈", "Calls Handled", "400K+/month", teal], ["⚡", "Response Latency", "<1 second", steel], ["🌍", "Languages", "30+ supported", teal], ["🔒", "Security", "SOC2 Type II", steel]].map(([icon, label, val, color]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 16, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "1.2rem 1.5rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{icon}</div>
              <div><div style={{ fontSize: "0.78rem", color: "#94A3B8", fontWeight: 600 }}>{label}</div><div style={{ fontWeight: 800, color: color as string, fontSize: "1.05rem" }}>{val}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 2rem 8rem" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textAlign: "center", marginBottom: "3rem", letterSpacing: -1 }}>The complete voice AI platform</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "⚡", title: "Instant Agent Setup", desc: "Train on PDFs, URLs or text. Live in under 5 minutes." },
            { icon: "📞", title: "Real Phone Numbers", desc: "Local, toll-free, or forward your existing business lines." },
            { icon: "🧠", title: "Smart Knowledge Base", desc: "Answers from your docs only. Zero hallucinations." },
            { icon: "🗣️", title: "Natural Conversations", desc: "Human-like voice with full interruption support." },
            { icon: "📊", title: "Analytics Dashboard", desc: "Transcripts, sentiment, and real-time call metrics." },
            { icon: "🔗", title: "Enterprise Integrations", desc: "Salesforce, SAP, ServiceNow, Zendesk and 100+ more." },
          ].map(f => (
            <div key={f.title} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "1.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.95rem" }}>{f.title}</h3>
              <p style={{ color: "#64748B", fontSize: "0.87rem", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "#0F172A", padding: "7rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: "1rem" }}>Ready at enterprise scale.</h2>
        <p style={{ color: "#94A3B8", marginBottom: "2.5rem" }}>Join 500+ businesses automating their phone lines today.</p>
        <button style={{ background: `linear-gradient(135deg, ${steel}, ${teal})`, color: "#fff", border: "none", borderRadius: 10, padding: "16px 42px", fontWeight: 800, fontSize: "1.05rem", cursor: "pointer" }}>Hire Your Agent Free 🚀</button>
      </section>
      <div style={{ textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}><a href="/themes" style={{ color: teal, fontWeight: 700, textDecoration: "none" }}>← Back to themes</a></div>
    </div>
  );
}
