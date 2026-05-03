export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "140px 5% 60px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="glass-panel" style={{ padding: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>Privacy Policy</h1>
        <p style={{ opacity: 0.8, marginBottom: "2rem" }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", lineHeight: 1.7, opacity: 0.8 }}>
          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>1. Data Collection</h2>
            <p>We collect information you provide directly to us, such as when you create or modify your account, request support, or communicate with us. We also collect audio recordings and transcripts from the AI calls as part of the core service functionality.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>2. Data Usage</h2>
            <p>We use the information we collect to provide, maintain, and improve our services. Audio and transcript data is strictly used for your analytics and to improve the specific agent models you train.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>3. Third-Party Sharing</h2>
            <p>We do not sell your personal data. We only share information with third-party service providers (such as Deepgram for STT/TTS) that are essential to delivering the AixCaller.live experience.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--text)" }}>4. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
