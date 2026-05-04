"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface User {
  email: string;
  name: string;
  picture: string;
  tenant_id: string;
}

const navItems = [
  { href: "/dashboard",              icon: "📊", label: "Overview" },
  { href: "/dashboard/agents",       icon: "🤖", label: "Agents" },
  { href: "/dashboard/knowledge",    icon: "📚", label: "Knowledge Base" },
  { href: "/dashboard/integrations", icon: "🔌", label: "Integrations" },
  { href: "/dashboard/live",         icon: "🔴", label: "Live Monitor" },
];

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
        background: active ? "rgba(16,185,129,0.18)" : "transparent",
        color: active ? "#6EE7B7" : "rgba(255,255,255,0.6)",
        fontWeight: active ? 700 : 500, fontSize: "0.88rem",
        transition: "all 0.15s", cursor: "pointer",
        borderLeft: active ? "3px solid #10B981" : "3px solid transparent",
      }}>
        <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>{icon}</span>
        {label}
        {label === "Live Monitor" && (
          <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 0 2px rgba(16,185,129,0.3)", animation: "pulse 2s infinite" }} />
        )}
      </div>
    </Link>
  );
}

export default function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname();

  // Avatar initials fallback
  const initials = user.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F6FEFA" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#064E3B",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Brand */}
        <div style={{ padding: "1.5rem 1.25rem 1.25rem", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🎙️</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff", letterSpacing: -0.3 }}>AIxCaller</div>
            <div style={{ fontSize: "0.65rem", color: "#6EE7B7", fontWeight: 500 }}>Dashboard</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", padding: "0.5rem 12px 0.25rem" }}>Main</div>
          {navItems.slice(0, 2).map(n => <NavItem key={n.href} {...n} active={path === n.href} />)}
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", padding: "1rem 12px 0.25rem" }}>Tools</div>
          {navItems.slice(2).map(n => <NavItem key={n.href} {...n} active={path === n.href} />)}
        </nav>

        {/* Credits */}
        <div style={{ padding: "1rem", margin: "0 0.75rem 0.75rem", background: "rgba(16,185,129,0.12)", borderRadius: 12, border: "1px solid rgba(16,185,129,0.2)" }}>
          <div style={{ fontSize: "0.72rem", color: "#6EE7B7", fontWeight: 600, marginBottom: 6 }}>CREDITS REMAINING</div>
          <div style={{ fontWeight: 900, fontSize: "1.3rem", color: "#fff" }}>500 <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#6EE7B7" }}>min</span></div>
          <div style={{ marginTop: 8, height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
            <div style={{ width: "65%", height: "100%", background: "linear-gradient(90deg,#10B981,#6EE7B7)", borderRadius: 999 }} />
          </div>
          <Link href="/dashboard/billing" style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: "0.72rem", color: "#6EE7B7", fontWeight: 700, textDecoration: "none" }}>Top Up Credits →</Link>
        </div>

        {/* User — real data */}
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          {user.picture ? (
            <img src={user.picture} alt={user.name} width={34} height={34}
              style={{ borderRadius: "50%", flexShrink: 0, border: "2px solid #10B981" }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#064E3B)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.9rem", flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || "My Workspace"}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
          <a href="/api/auth/logout" title="Sign out" style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.3)", textDecoration: "none", flexShrink: 0 }}>↩</a>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.5}50%{opacity:1} }`}</style>
      </aside>

      {/* Main area */}
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{ height: 60, background: "#fff", borderBottom: "1px solid #D1FAE5", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", position: "sticky", top: 0, zIndex: 40 }}>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#064E3B" }}>
            {navItems.find(n => n.href === path)?.label ?? "Dashboard"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ECFDF5", border: "1px solid #D1FAE5", borderRadius: 999, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#059669" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              All systems operational
            </div>
            <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
              <button style={{ background: "#064E3B", color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                + New Agent
              </button>
            </Link>
          </div>
        </div>
        <div style={{ padding: "2rem", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
