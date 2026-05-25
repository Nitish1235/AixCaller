import Link from "next/link";

export default function CampaignsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", height: "100%", width: "100%" }}>
      {/* Top Search Bar Area (Mocking the UI from the screenshot) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, 
          background: "#fff", border: "1.5px solid var(--border)", 
          borderRadius: 8, padding: "8px 14px", width: 300 
        }}>
          <span style={{ color: "var(--text-muted)", fontSize: "1rem" }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search setups..." 
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%" }} 
            disabled
          />
        </div>
        <Link href="/dashboard/campaigns/builder" style={{ textDecoration: "none" }}>
          <button style={{ 
            background: "var(--blue)", color: "#fff", border: "none", 
            borderRadius: 8, padding: "10px 18px", fontWeight: 700, 
            fontSize: "0.85rem", cursor: "pointer", 
            boxShadow: "0 4px 12px rgba(29, 78, 216, 0.2)",
            display: "flex", alignItems: "center", gap: 6
          }}>
            <span>+</span> Create System
          </button>
        </Link>
      </div>

      {/* Empty State Card */}
      <div style={{
        background: "#fff",
        border: "1.5px solid var(--border)",
        borderRadius: 16,
        padding: "5rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
        marginTop: "2rem"
      }}>
        <div style={{ 
          width: 50, height: 50, borderRadius: "50%", 
          background: "var(--blue-light)", color: "var(--blue)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem", fontWeight: 300, marginBottom: "1.5rem"
        }}>
          +
        </div>
        <h2 style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text)", margin: "0 0 0.5rem" }}>
          No Setups Created Yet
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 2rem", maxWidth: 400 }}>
          Create your first automated setup to start managing leads efficiently.
        </p>
        <Link href="/dashboard/campaigns/builder" style={{ textDecoration: "none" }}>
          <button style={{ 
            background: "var(--blue)", color: "#fff", border: "none", 
            borderRadius: 8, padding: "12px 24px", fontWeight: 700, 
            fontSize: "0.9rem", cursor: "pointer", 
            boxShadow: "0 4px 14px rgba(29, 78, 216, 0.25)",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <span>+</span> Create Your First System
          </button>
        </Link>
      </div>

    </div>
  );
}
