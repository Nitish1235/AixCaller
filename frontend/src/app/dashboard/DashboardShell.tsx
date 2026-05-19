"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface User {
  email: string;
  name: string;
  picture: string;
  tenant_id: string;
}

const navItems = [
  { href: "/dashboard",              icon: "📊", label: "Overview" },
  { href: "/dashboard/agents",       icon: "🤖", label: "Agents" },
  { href: "/dashboard/calls",        icon: "📞", label: "Calls" },
  { href: "/dashboard/leads",        icon: "📋", label: "Leads" },
  { href: "/dashboard/knowledge",    icon: "📚", label: "Knowledge" },
  { href: "/dashboard/integrations", icon: "🔌", label: "Integrations" },
  { href: "/dashboard/billing",      icon: "💳", label: "Billing" },
];

// Full labels for sidebar
const navItemsFull = [
  { href: "/dashboard",              icon: "📊", label: "Overview" },
  { href: "/dashboard/agents",       icon: "🤖", label: "Agents" },
  { href: "/dashboard/calls",        icon: "📞", label: "Call History" },
  { href: "/dashboard/leads",        icon: "📋", label: "Leads" },
  { href: "/dashboard/knowledge",    icon: "📚", label: "Knowledge Base" },
  { href: "/dashboard/integrations", icon: "🔌", label: "Integrations" },
  { href: "/dashboard/billing",      icon: "💳", label: "Billing" },
];

function NavItem({ href, icon, label, active, onClick }: {
  href: string; icon: string; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }} onClick={onClick}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
        background: active ? "var(--accent-yellow)" : "transparent",
        color: active ? "var(--text)" : "#cbd5e1",
        fontWeight: active ? 900 : 600, fontSize: "0.9rem",
        transition: "transform 0.1s", cursor: "pointer",
        border: active ? "2px solid #fff" : "2px solid transparent",
        boxShadow: active ? "4px 4px 0 #fff" : "none",
        textTransform: "uppercase"
      }}>
        <span style={{ fontSize: "1.1rem", width: 20, textAlign: "center", filter: active ? "none" : "grayscale(100%) brightness(200%)" }}>{icon}</span>
        {label}
      </div>
    </Link>
  );
}

export default function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname();
  const [billing, setBilling] = useState<{ minutes_left: number; minutes_included: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      apiGet(`/billing/subscription?tenant_id=${user.tenant_id}`)
        .then(data => setBilling(data))
        .catch(err => console.error("Failed to load billing status", err));
    }
  }, [user?.tenant_id]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [path]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const initials = user.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  const currentLabel = navItemsFull.find(n => n.href === path)?.label ?? "Dashboard";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 49, display: "none",
          }}
          className="mobile-overlay"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="dashboard-sidebar"
        style={{
          width: 250, flexShrink: 0, background: "var(--text)", borderRight: "var(--border)",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
          overflowY: "auto",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "1.5rem 1.25rem 1.25rem", borderBottom: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={42} showText={true} dark={true} />
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            style={{
              display: "none", background: "none", border: "none",
              color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer",
              padding: "4px 8px", lineHeight: 1,
            }}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", padding: "0 12px", marginBottom: "0.5rem" }}>Main</div>
          {navItemsFull.slice(0, 2).map(n => <NavItem key={n.href} {...n} active={path === n.href} onClick={() => setSidebarOpen(false)} />)}
          <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", padding: "0 12px", margin: "1rem 0 0.5rem" }}>Tools</div>
          {navItemsFull.slice(2).map(n => <NavItem key={n.href} {...n} active={path === n.href} onClick={() => setSidebarOpen(false)} />)}
        </nav>

        {/* Credits */}
        <div style={{ padding: "1rem", margin: "0 1rem 1rem", background: "var(--accent-pink)", borderRadius: 16, border: "2px solid #fff", boxShadow: "4px 4px 0 #fff" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text)", fontWeight: 900, marginBottom: 4, textTransform: "uppercase" }}>Credits Left</div>
          <div className="mono" style={{ fontWeight: 900, fontSize: "1.5rem", color: "var(--text)", lineHeight: 1 }}>
            {billing ? Math.floor(billing.minutes_left) : "..."} <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>min</span>
          </div>
          <div style={{ marginTop: 12, height: 8, background: "rgba(0,0,0,0.1)", borderRadius: 999, border: "2px solid var(--text)" }}>
            <div style={{ 
              width: billing && billing.minutes_included > 0 ? `${Math.min(100, Math.max(0, (billing.minutes_left / billing.minutes_included) * 100))}%` : "0%", 
              height: "100%", background: "var(--accent-green)", borderRadius: 999, borderRight: "2px solid var(--text)", transition: "width 0.5s ease" 
            }} />
          </div>
          <Link href="/dashboard/billing" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: "0.85rem", color: "var(--text)", fontWeight: 900, textDecoration: "underline" }}>Manage Plan</Link>
        </div>

        {/* User */}
        <div style={{ padding: "1rem", borderTop: "2px solid #334155", display: "flex", alignItems: "center", gap: 10, background: "#020617" }}>
          {user.picture ? (
            <img src={user.picture} alt={user.name} width={36} height={36}
              style={{ borderRadius: "50%", flexShrink: 0, border: "2px solid var(--accent-yellow)" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "var(--text)", fontSize: "1rem", flexShrink: 0, border: "2px solid #fff" }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 900, fontSize: "0.85rem", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || "My Workspace"}</div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
          <a 
            href="/api/auth/logout" 
            onClick={() => { if (typeof window !== "undefined") localStorage.removeItem("tenant_id"); }}
            title="Sign out" 
            style={{ fontSize: "1.2rem", color: "#64748b", textDecoration: "none", flexShrink: 0, fontWeight: 900 }}
          >
            ×
          </a>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="dashboard-main" style={{ marginLeft: 250, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{
          height: 64, background: "#fff", borderBottom: "var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 40,
        }}>
          {/* Left: hamburger (mobile) + page title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="hamburger-btn"
              aria-label="Open navigation"
              style={{
                display: "none", background: "none", border: "2px solid var(--text)",
                borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                color: "var(--text)", fontSize: "1.1rem", lineHeight: 1,
              }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--text)", textTransform: "uppercase" }}>
              {currentLabel}
            </span>
          </div>

          {/* Right: status badge + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="status-badge" style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--accent-green)", border: "2px solid var(--text)",
              borderRadius: 999, padding: "6px 14px",
              fontSize: "0.8rem", fontWeight: 900, color: "var(--text)",
              boxShadow: "2px 2px 0 var(--text)", textTransform: "uppercase",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text)", display: "inline-block" }} />
              Operational
            </div>
            <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
              <button className="btn-brutal" style={{ padding: "7px 18px", fontSize: "0.85rem" }}>
                + Agent
              </button>
            </Link>
          </div>
        </div>

        {/* Page content */}
        <div className="dash-content">{children}</div>
      </div>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="mobile-bottom-nav" style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
        height: 60, background: "var(--text)", borderTop: "3px solid #334155",
        zIndex: 48, alignItems: "center", justifyContent: "space-around",
        padding: "0 4px",
      }}>
        {navItems.slice(0, 5).map(n => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration: "none", flex: 1 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, padding: "6px 4px",
                color: active ? "var(--accent-yellow)" : "#94a3b8",
              }}>
                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{n.icon}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {n.label}
                </span>
                {active && (
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-yellow)" }} />
                )}
              </div>
            </Link>
          );
        })}
        {/* More button → opens sidebar */}
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 2, padding: "6px 4px",
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8",
          }}
        >
          <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>⋯</span>
          <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase" }}>More</span>
        </button>
      </nav>

      {/* Responsive styles via a style tag */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(-100%);
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          .dashboard-main {
            margin-left: 0 !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
          .mobile-overlay {
            display: block !important;
          }
          .hamburger-btn {
            display: flex !important;
            align-items: center;
          }
          .sidebar-close-btn {
            display: flex !important;
            align-items: center;
          }
          .status-badge {
            display: none !important;
          }
        }
      `}</style>

      {/* Apply open class dynamically via JS */}
      {sidebarOpen && (
        <style>{`
          .dashboard-sidebar { transform: translateX(0) !important; }
          .mobile-overlay { display: block !important; }
        `}</style>
      )}
    </div>
  );
}
