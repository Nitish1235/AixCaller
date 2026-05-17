export default function TermsOfService() {
  return (
    <main style={{
      minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
      padding: "6rem 5%", fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", border: "var(--border)", borderRadius: 24, padding: "4rem", boxShadow: "8px 8px 0 var(--accent-yellow)" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem", letterSpacing: -1 }}>Terms of Service</h1>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "#64748b", marginBottom: "3rem" }}>Last Updated: May 2026</p>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>1. Acceptance of Terms</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            By accessing or using AIxCaller ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service. You must be at least 18 years old to use this Service.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>2. Use of AI Voice Agents</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            You agree to use AIxCaller solely for lawful purposes. You are strictly prohibited from using our global telephony infrastructure and AI agents for:
          </p>
          <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>Spamming, robocalling without consent, or violating the TCPA (Telephone Consumer Protection Act) or equivalent local telecommunications laws.</li>
            <li style={{ marginBottom: "0.5rem" }}>Impersonating real individuals without their explicit authorization or attempting to defraud users.</li>
            <li style={{ marginBottom: "0.5rem" }}>Deploying agents that generate hate speech, illegal advice, or explicit content.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>3. Billing & Subscriptions</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            AIxCaller operates on a subscription and per-second usage basis via Stripe.
          </p>
          <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>Your selected plan (Starter, Pro, or Premium) grants a specific allotment of minutes per month.</li>
            <li style={{ marginBottom: "0.5rem" }}>Overage minutes are billed automatically. You are responsible for monitoring your usage in the dashboard.</li>
            <li style={{ marginBottom: "0.5rem" }}>Subscriptions automatically renew unless canceled prior to the billing cycle.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>4. Service Availability & SLA</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500, marginBottom: "1rem" }}>
            While we target low-latency responses and high availability through our infrastructure providers (Telnyx, Supabase), we do not warrant that the Service will be 100% uninterrupted or that specific response time thresholds will always be met. We are not liable for business losses incurred due to temporary API outages or telecom network failures.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>5. Contact</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, fontWeight: 500 }}>
            Legal inquiries can be directed to <strong style={{ color: "var(--accent-green)" }}>legal@callerx.ai</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
