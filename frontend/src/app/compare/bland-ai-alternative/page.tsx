import Link from "next/link";

export const metadata = {
  title: "The Best Bland AI Alternative | AIxCaller",
  description: "Looking for a Bland AI alternative? AIxCaller offers transparent pricing, rapid knowledge base retrieval, and global SIP trunking for enterprise voice AI.",
};

export default function BlandAIAlternativePage() {
  return (
    <main style={{ paddingBottom: "4rem", paddingTop: "6rem", maxWidth: 1000, margin: "0 auto", padding: "8rem 5% 4rem" }}>
      <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 900, textTransform: "uppercase", marginBottom: "2rem" }}>
        The Premier Bland AI Alternative
      </h1>
      <p style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "#475569", marginBottom: "2rem" }}>
        If you are looking for a reliable, highly customizable, and transparently priced voice AI platform, AIxCaller is the superior alternative to Bland AI. We built our infrastructure from the ground up for sub-second latency and flawless enterprise integrations.
      </p>
      
      <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "3rem", marginBottom: "1rem" }}>Why Choose AIxCaller over Bland AI?</h2>
      <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#475569", paddingLeft: "1.5rem", marginBottom: "3rem" }}>
        <li style={{ marginBottom: "1rem" }}><strong>Transparent Pricing:</strong> No hidden markup on telecom minutes. Our subscription plans give you a clear, predictable cost structure with bundled minutes and a flat overage rate.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Lightning Fast Knowledge Retrieval:</strong> Our proprietary vector search architecture means your agent reads your PDFs and policy manuals in milliseconds, ensuring no awkward pauses on the phone.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Instant Number Provisioning:</strong> Get local or toll-free numbers across 30+ countries with a single click in our dashboard.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Dedicated Support:</strong> Real human support to help you tune your system prompts and optimize your agent's performance.</li>
      </ul>

      <div style={{ background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: "16px", padding: "2rem", marginBottom: "3rem" }}>
        <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem", color: "#0f172a" }}>Compare the Latency</h3>
        <p style={{ color: "#475569", lineHeight: 1.5 }}>
          Voice AI is entirely dependent on latency. AIxCaller uses an optimized edge architecture to ensure the delay between the human speaking and the AI responding is nearly imperceptible. Test it for yourself on our homepage demo.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <Link href="/signup">
          <button className="btn-brutal" style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>Start Building Free</button>
        </Link>
        <Link href="/">
          <button className="btn-brutal white" style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>Test the Live Demo</button>
        </Link>
      </div>
    </main>
  );
}
