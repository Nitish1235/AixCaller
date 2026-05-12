export default function PrivacyPolicy() {
  return (
    <main style={{
      minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
      padding: "6rem 5%", fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", border: "var(--border)", borderRadius: 24, padding: "4rem", boxShadow: "8px 8px 0 var(--accent-pink)" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem", letterSpacing: -1 }}>Privacy Policy</h1>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "#64748b", marginBottom: "3rem" }}>Last Updated: May 2026</p>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>1. Information We Collect</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            When you use AIxCaller, we collect information you provide directly to us, such as your name, email address, and payment information when creating an account. Additionally, because our platform involves telecommunications, we collect and store call transcripts, audio recordings (if enabled by you), and Knowledge Base documents (uploaded PDFs/URLs).
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>2. How We Use Your Information</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            We use the collected information strictly to:
          </p>
          <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>Operate and maintain the AI voice agent services.</li>
            <li style={{ marginBottom: "0.5rem" }}>Process payments and track per-second billing via Stripe.</li>
            <li style={{ marginBottom: "0.5rem" }}>Generate post-call email summaries and provide transcripts.</li>
            <li style={{ marginBottom: "0.5rem" }}>Improve the latency and accuracy of our semantic vector search (pgvector).</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>3. Data Sharing & Third Parties</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            We do not sell your personal data or your customers' data. We share data only with essential third-party infrastructure providers required to operate the service, including:
          </p>
          <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}><strong>Telnyx:</strong> For provisioning global phone numbers and routing SIP trunks.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Deepgram & ElevenLabs:</strong> For speech-to-text and text-to-speech processing.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Stripe:</strong> For secure payment processing.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Supabase:</strong> For secure database and vector knowledge base storage.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>4. Contact Us</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500 }}>
            If you have any questions or concerns about this Privacy Policy, please contact us at <strong style={{ color: "var(--accent-green)" }}>privacy@callerx.ai</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
