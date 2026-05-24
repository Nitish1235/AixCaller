'use client';
import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)", padding: "5rem 5% 3rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "3rem", marginBottom: "4rem" }}>
          {/* Brand */}
          <div style={{ gridColumn: "span 2", minWidth: 240 }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <Logo size={32} showText={true} dark={false} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
              The AI receptionist that answers every call 24/7, qualifies leads, books appointments, and syncs directly with your CRM.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text)" }}>Product</h4>
            {["Features", "Outbound Dialer", "Pricing", "Integrations"].map(l => (
              <div key={l} style={{ marginBottom: 12 }}>
                <Link href={l === "Outbound Dialer" ? "/#outbound" : `/#${l.toLowerCase().replace(" ", "-")}`} style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--blue)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
                  {l}
                </Link>
              </div>
            ))}
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text)" }}>Company</h4>
            {["About Us", "Contact"].map(l => (
              <div key={l} style={{ marginBottom: 12 }}>
                <Link href={l === "Contact" ? "/contact" : "/#use-cases"} style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--blue)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
                  {l}
                </Link>
              </div>
            ))}
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "0.85rem", letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text)" }}>Legal</h4>
            {[[ "Terms of Service", "/terms" ], [ "Privacy Policy", "/privacy" ]].map(([l, href]) => (
              <div key={l as string} style={{ marginBottom: 12 }}>
                <Link href={href as string} style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--blue)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
                  {l}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1.5px solid var(--border)", paddingTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>© 2026 AIxCaller. All rights reserved.</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Enterprise-Grade Voice AI</p>
        </div>
      </div>
    </footer>
  );
}
