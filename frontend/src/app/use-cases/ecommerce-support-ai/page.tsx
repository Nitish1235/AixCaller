import Link from "next/link";

export const metadata = {
  title: "E-Commerce AI Voice Support Agent | AIxCaller",
  description: "Automate WISMO (Where is my order?) calls, refunds, and product FAQs with an AI voice agent built for e-commerce.",
};

export default function EcommerceAIPage() {
  return (
    <main style={{ paddingBottom: "4rem", paddingTop: "6rem", maxWidth: 1000, margin: "0 auto", padding: "8rem 5% 4rem" }}>
      <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 900, textTransform: "uppercase", marginBottom: "2rem" }}>
        E-Commerce Voice Support AI
      </h1>
      <p style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "#475569", marginBottom: "2rem" }}>
        Stop drowning in repetitive customer service calls. Our AI voice agent can handle infinite concurrent calls, instantly answering questions about shipping times, return policies, and product details.
      </p>
      
      <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "3rem", marginBottom: "1rem" }}>Solve E-Commerce Support Challenges</h2>
      <ul style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#475569", paddingLeft: "1.5rem", marginBottom: "3rem" }}>
        <li style={{ marginBottom: "1rem" }}><strong>Automate WISMO:</strong> Over 40% of e-commerce calls are "Where is my order?". Train the AI to answer these instantly based on your store policies.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Handle Peak Season Spikes:</strong> Whether it's Black Friday or a flash sale, the AI scales instantly to answer hundreds of simultaneous callers.</li>
        <li style={{ marginBottom: "1rem" }}><strong>Post-Call Transcripts:</strong> Every call is transcribed and summarized, allowing your human team to review complex cases without listening to the audio.</li>
      </ul>

      <Link href="/signup">
        <button className="btn-brutal" style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>Automate Your Support Desk</button>
      </Link>
    </main>
  );
}
