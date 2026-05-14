import Link from "next/link";

export const metadata = {
  title: "Real Estate AI Voice Agent | AIxCaller",
  description: "Automate real estate lead qualification, appointment scheduling, and property inquiries with our 24/7 AI voice agent.",
};

export default function RealEstateAIPage() {
  return (
    <main style={{ paddingBottom: "4rem", paddingTop: "6rem", maxWidth: 1000, margin: "0 auto", padding: "8rem 5% 4rem" }}>
      <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 900, textTransform: "uppercase", marginBottom: "2rem" }}>
        Real Estate AI Voice Agent
      </h1>
      <p style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "#475569", marginBottom: "2rem" }}>
        Real estate moves fast. Don't let leads go cold because you couldn't pick up the phone. Our AI voice agent answers instantly, qualifies the buyer's intent, and schedules a viewing directly on your calendar.
      </p>
      
      <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "3rem", marginBottom: "1rem" }}>Key Benefits for Realtors</h2>
      <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#475569", paddingLeft: "1.5rem", marginBottom: "3rem" }}>
        <li style={{ marginBottom: "1rem" }}><strong>24/7 Lead Qualification:</strong> The agent asks about budget, timeline, and pre-approval status before routing the lead to you.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Instant Property Details:</strong> Upload your property brochures and FAQs to the knowledge base so the agent can answer specific property questions intelligently.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Automated Scheduling:</strong> Books property tours and syncs seamlessly with your calendar.</li>
      </ul>

      <Link href="/signup">
        <button className="btn-brutal" style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>Deploy Your Real Estate Agent</button>
      </Link>
    </main>
  );
}
