import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ background: "#064E3B", color: "#fff", padding: "4rem 5% 2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🎙️</div>
              <span style={{ fontWeight: 900, fontSize: "1.1rem" }}>AIxCaller</span>
            </div>
            <p style={{ color: "#6EE7B7", fontSize: "0.88rem", lineHeight: 1.6, maxWidth: 260 }}>
              The AI voice platform that answers every call, qualifies every lead, and never takes a day off.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase", color: "#6EE7B7" }}>Product</h4>
            {["Features", "Pricing", "Integrations"].map(l => (
              <div key={l} style={{ marginBottom: 8 }}><Link href={`/#${l.toLowerCase().replace(" ", "-")}`} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.88rem", textDecoration: "none" }}>{l}</Link></div>
            ))}
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase", color: "#6EE7B7" }}>Company</h4>
            {["About Us", "Contact"].map(l => (
              <div key={l} style={{ marginBottom: 8 }}><Link href={l === "Contact" ? "/contact" : "/#use-cases"} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.88rem", textDecoration: "none" }}>{l}</Link></div>
            ))}
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase", color: "#6EE7B7" }}>Legal</h4>
            {[[ "Terms of Service", "/terms" ], [ "Privacy Policy", "/privacy" ]].map(([l, href]) => (
              <div key={l as string} style={{ marginBottom: 8 }}><Link href={href as string} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.88rem", textDecoration: "none" }}>{l}</Link></div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>© 2026 AIxCaller. All rights reserved.</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>Built with Pipecat · Deepgram · GPT-4o</p>
        </div>
      </div>
    </footer>
  );
}
