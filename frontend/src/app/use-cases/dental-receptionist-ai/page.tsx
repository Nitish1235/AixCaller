import Link from "next/link";

export const metadata = {
  title: "Dental Receptionist AI Voice Agent | AIxCaller",
  description: "Reduce missed calls and automate patient booking for your dental clinic with a 24/7 AI voice receptionist.",
};

export default function DentalAIPage() {
  return (
    <main style={{ paddingBottom: "4rem", paddingTop: "6rem", maxWidth: 1000, margin: "0 auto", padding: "8rem 5% 4rem" }}>
      <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 900, textTransform: "uppercase", marginBottom: "2rem" }}>
        Dental Receptionist AI
      </h1>
      <p style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "#475569", marginBottom: "2rem" }}>
        Every missed call is a missed patient. Let our AI voice receptionist handle the front desk overflow. It answers FAQs, processes appointment requests, and routes emergency calls instantly.
      </p>
      
      <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "3rem", marginBottom: "1rem" }}>Why Clinics Need Voice AI</h2>
      <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#475569", paddingLeft: "1.5rem", marginBottom: "3rem" }}>
        <li style={{ marginBottom: "1rem" }}><strong>Zero Missed Calls:</strong> Never miss a patient inquiry during lunch hours, weekends, or busy periods.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Policy & Insurance Answers:</strong> Train the AI on your accepted insurance providers and clinic policies to give accurate answers.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Emergency Routing:</strong> The agent can recognize high-priority dental emergencies and instantly forward the call to the on-call dentist.</li>
      </ul>

      <Link href="/signup">
        <button className="btn-brutal" style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>Deploy Your Dental AI Desk</button>
      </Link>
    </main>
  );
}
