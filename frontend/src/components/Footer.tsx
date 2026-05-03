import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ 
      padding: "3rem 5%", 
      borderTop: "1px solid var(--glass-border)", 
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", gap: "2rem", fontWeight: 500, fontSize: "0.9rem", opacity: 0.8 }}>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <div style={{ opacity: 0.5, fontSize: "0.85rem", textAlign: "center" }}>
        © 2026 AixCaller.live. Built with Pipecat & Deepgram.
      </div>
    </footer>
  );
}
