export default function PrivacyPolicy() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--surface)",
      backgroundImage: "radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.03) 0%, transparent 80%), var(--surface)",
      color: "var(--text)",
      padding: "8rem 5%",
    }}>
      <div style={{
        maxWidth: 800,
        margin: "0 auto",
        background: "#ffffff",
        border: "1.5px solid var(--border)",
        borderRadius: 24,
        padding: "4rem",
        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.03)",
      }}>
        <h1 style={{
          fontSize: "clamp(2.2rem, 4vw, 3rem)",
          fontWeight: 800,
          marginBottom: "0.5rem",
          letterSpacing: "-0.8px",
          color: "var(--text)"
        }}>
          Privacy Policy
        </h1>
        <p style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          marginBottom: "3rem"
        }}>
          Last Updated: May 2026
        </p>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--text)"
          }}>
            1. Information We Collect
          </h2>
          <p style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--text-body)",
            marginBottom: "1rem"
          }}>
            When you use AIxCaller, we collect information you provide directly to us, such as your name, email address, and payment information when creating an account. Additionally, because our platform involves telecommunications, we collect and store call transcripts, audio recordings (if enabled by you), and Knowledge Base documents (uploaded PDFs/URLs).
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--text)"
          }}>
            2. How We Use Your Information
          </h2>
          <p style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--text-body)",
            marginBottom: "1rem"
          }}>
            We use the collected information strictly to:
          </p>
          <ul style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--text-body)",
            paddingLeft: "1.5rem"
          }}>
            <li style={{ marginBottom: "0.5rem" }}>Operate and maintain the AI voice agent services.</li>
            <li style={{ marginBottom: "0.5rem" }}>Process payments and track per-second billing via Stripe.</li>
            <li style={{ marginBottom: "0.5rem" }}>Generate post-call email summaries and provide transcripts.</li>
            <li style={{ marginBottom: "0.5rem" }}>Improve the latency and accuracy of our semantic vector search (pgvector).</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--text)"
          }}>
            3. Data Sharing & Third Parties
          </h2>
          <p style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--text-body)",
            marginBottom: "1rem"
          }}>
            We do not sell your personal data or your customers' data. We share data only with essential third-party infrastructure providers required to operate the service, including:
          </p>
          <ul style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--text-body)",
            paddingLeft: "1.5rem"
          }}>
            <li style={{ marginBottom: "0.5rem" }}><strong>Telnyx:</strong> For provisioning global phone numbers and routing SIP trunks.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Deepgram & ElevenLabs:</strong> For speech-to-text and text-to-speech processing.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Stripe:</strong> For secure payment processing.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Supabase:</strong> For secure database and vector knowledge base storage.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "1rem",
            color: "var(--text)"
          }}>
            4. Contact Us
          </h2>
          <p style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--text-body)"
          }}>
            If you have any questions or concerns about this Privacy Policy, please contact us at <strong style={{ color: "var(--blue)" }}>privacy@aixcaller.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
