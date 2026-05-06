"use client";

export default function BillingPage() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ fontWeight: 900, fontSize: "1.6rem", color: "#064E3B", marginBottom: "1.5rem" }}>Billing & Usage</h1>
      <div style={{ padding: "4rem", textAlign: "center", background: "#fff", borderRadius: 16, border: "1.5px solid #D1FAE5" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💳</div>
        <h3>Billing Dashboard</h3>
        <p>You are currently on the <strong>Free Trial</strong> with 500 minutes remaining.</p>
        <button style={{ marginTop: "1rem", background: "#064E3B", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "not-allowed" }}>
          Upgrade Coming Soon
        </button>
      </div>
    </div>
  );
}
