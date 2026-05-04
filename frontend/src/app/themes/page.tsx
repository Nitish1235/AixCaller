"use client";
import Link from "next/link";

const themes = [
  { slug: "arctic",  name: "1. Arctic",  desc: "Clean white + electric blue. Sharp, minimal — like Linear/Vercel. ★ Your pick", accent: "#2563EB" },
  { slug: "ivory",   name: "2. Ivory",   desc: "Warm off-white + amber gold. Premium luxury serif feel.", accent: "#D97706" },
  { slug: "prism",   name: "3. Prism",   desc: "White + bold violet/cyan gradient blocks. Like Stripe. ★ Your pick", accent: "#7C3AED" },
  { slug: "aurora",  name: "4. Aurora",  desc: "Soft gray + sky blue + emerald. Friendly modern SaaS.", accent: "#0EA5E9" },
  { slug: "nova",    name: "5. Nova",    desc: "White + indigo + electric orange. Bold complementary contrast.", accent: "#4F46E5" },
  { slug: "zenith",  name: "6. Zenith",  desc: "White + emerald green. Clean left-border card style.", accent: "#10B981" },
  { slug: "spark",   name: "7. Spark",   desc: "Warm white + yellow-to-orange gradient. Energetic startup.", accent: "#F97316" },
  { slug: "glacier", name: "8. Glacier", desc: "Icy white + pure blue. Apple-inspired minimal design.", accent: "#0099FF" },
  { slug: "steel",   name: "9. Steel",   desc: "White + steel blue + teal. Enterprise SaaS feel.", accent: "#0D9488" },
  { slug: "dusk",    name: "10. Dusk",   desc: "White + deep purple + magenta. Bento grid layout.", accent: "#6D28D9" },
  { slug: "cobalt",  name: "11. Cobalt", desc: "Cobalt blue nav + bright yellow. Bold Figma-style.", accent: "#0047AB" },
  { slug: "horizon", name: "12. Horizon",desc: "White + rose + violet gradient. Modern romantic.", accent: "#E11D48" },
  { slug: "mint",    name: "13. Mint",   desc: "Fresh mint green on light green-white. Clean & fresh.", accent: "#10D9A0" },
];

export default function ThemeIndex() {
  return (
    <div style={{ background: "#F1F5F9", minHeight: "100vh", padding: "4rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "#E0F2FE", color: "#0284C7", padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>Theme Selector</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#0F172A", margin: 0, letterSpacing: -1 }}>Pick Your Design Theme</h1>
          <p style={{ color: "#64748B", marginTop: 12, fontSize: "1.05rem" }}>Click any theme to preview the full page. Tell me which one you like!</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {themes.map((t) => (
            <Link href={`/themes/${t.slug}`} key={t.slug} style={{ textDecoration: "none" }}>
              <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", border: "2px solid #E2E8F0", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "transform 0.15s, box-shadow 0.15s" }}>
                {/* Accent bar */}
                <div style={{ height: 6, background: t.accent }} />
                <div style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0F172A" }}>{t.name}</span>
                  </div>
                  <p style={{ color: "#64748B", margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>{t.desc}</p>
                  <div style={{ marginTop: 12, color: t.accent, fontWeight: 700, fontSize: "0.82rem" }}>Preview →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: "3rem", color: "#94A3B8", fontSize: "0.85rem" }}>After choosing, tell me the theme name and I'll apply it to the entire site.</p>
      </div>
    </div>
  );
}
