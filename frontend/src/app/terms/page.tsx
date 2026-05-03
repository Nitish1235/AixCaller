export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "140px 5% 60px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="glass-panel" style={{ padding: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>Terms of Service</h1>
        <p style={{ opacity: 0.8, marginBottom: "2rem" }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", lineHeight: 1.7, opacity: 0.8 }}>
          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>1. Introduction</h2>
            <p>Welcome to AixCaller.live. By accessing or using our service, you agree to be bound by these Terms of Service.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>2. Use of Service</h2>
            <p>AixCaller.live provides AI voice agents for business communication. You agree to use these services legally and ethically, and you remain solely responsible for the content and nature of the calls made by your agents.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>3. Billing</h2>
            <p>Services are billed on a pay-as-you-go basis or through a monthly subscription depending on your plan. All payments are non-refundable.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>4. Liability</h2>
            <p>We are not responsible for any lost profits, revenues, or data, financial losses or indirect, special, consequential, exemplary, or punitive damages resulting from the use of our services.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
