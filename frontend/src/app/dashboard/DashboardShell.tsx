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
  { href: "/dashboard/campaigns",    icon: "📣", label: "Campaigns" },
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
  { href: "/dashboard/campaigns",    icon: "📣", label: "Outbound Campaigns" },
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
      <div 
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
          background: active ? "var(--blue-light)" : "transparent",
          color: active ? "var(--blue)" : "var(--text-muted)",
          fontWeight: active ? 700 : 600, fontSize: "0.92rem",
          transition: "var(--transition)", cursor: "pointer",
          border: active ? "1.5px solid rgba(29, 78, 216, 0.15)" : "1.5px solid transparent",
          boxShadow: active ? "0 4px 12px rgba(29, 78, 216, 0.04)" : "none",
          textTransform: "none"
        }}
      >
        <span style={{ fontSize: "1.1rem", width: 20, textAlign: "center", filter: active ? "none" : "grayscale(40%) opacity(80%)" }}>{icon}</span>
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
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.15)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 49, display: "none",
          }}
          className="mobile-overlay"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="dashboard-sidebar"
        style={{
          width: 250, flexShrink: 0, 
          background: "var(--surface)", 
          borderRight: "1.5px solid var(--border)",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
          overflowY: "auto",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "1.5rem 1.25rem 1.25rem", borderBottom: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff" }}>
          <Logo size={42} showText={true} dark={false} />
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            style={{
              display: "none", background: "none", border: "none",
              color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer",
              padding: "4px 8px", lineHeight: 1,
            }}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", padding: "0 12px", marginBottom: "0.4rem", letterSpacing: 0.5 }}>Main</div>
          {navItemsFull.slice(0, 2).map(n => <NavItem key={n.href} {...n} active={path === n.href} onClick={() => setSidebarOpen(false)} />)}
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", padding: "0 12px", margin: "1rem 0 0.4rem", letterSpacing: 0.5 }}>Tools</div>
          {navItemsFull.slice(2).map(n => <NavItem key={n.href} {...n} active={path === n.href} onClick={() => setSidebarOpen(false)} />)}
        </nav>

        {/* Credits Card */}
        <div style={{ padding: "1.25rem", margin: "0 1rem 1.25rem", background: "var(--blue-light)", borderRadius: 16, border: "1.5px solid rgba(29, 78, 216, 0.12)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--blue)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Minutes Left</div>
          <div className="mono" style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--text)", lineHeight: 1 }}>
            {billing ? Math.floor(billing.minutes_left) : "..."} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>min</span>
          </div>
          <div style={{ marginTop: 12, height: 6, background: "rgba(29, 78, 216, 0.1)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ 
              width: billing && billing.minutes_included > 0 ? `${Math.min(100, Math.max(0, (billing.minutes_left / billing.minutes_included) * 100))}%` : "0%", 
              height: "100%", background: "var(--blue)", borderRadius: 999, transition: "width 0.5s ease" 
            }} />
          </div>
          <Link href="/dashboard/billing" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: "0.85rem", color: "var(--blue)", fontWeight: 700, textDecoration: "underline" }}>Manage Plan</Link>
        </div>

        {/* User */}
        <div style={{ padding: "1rem", borderTop: "1.5px solid var(--border)", display: "flex", alignItems: "center", gap: 10, background: "#ffffff" }}>
          {user.picture ? (
            <img src={user.picture} alt={user.name} width={36} height={36}
              style={{ borderRadius: "50%", flexShrink: 0, border: "1.5px solid var(--border)" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--blue)", fontSize: "0.95rem", flexShrink: 0, border: "1.5px solid rgba(29, 78, 216, 0.15)" }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || "Workspace"}</div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
          <a 
            href="/api/auth/logout" 
            onClick={() => { if (typeof window !== "undefined") localStorage.removeItem("tenant_id"); }}
            title="Sign out" 
            style={{ fontSize: "1.2rem", color: "var(--text-muted)", textDecoration: "none", flexShrink: 0, fontWeight: 700, cursor: "pointer", transition: "var(--transition)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          >
            ×
          </a>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="dashboard-main" style={{ marginLeft: 250, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{
          height: 64, background: "#ffffff", borderBottom: "1.5px solid var(--border)",
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
                display: "none", background: "none", border: "1.5px solid var(--border)",
                borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                color: "var(--text)", fontSize: "1.1rem", lineHeight: 1,
              }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text)", textTransform: "none", letterSpacing: "-0.3px" }}>
              {currentLabel}
            </span>
          </div>

          {/* Right: status badge + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="status-badge" style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--green-light)", border: "1.5px solid rgba(5, 150, 105, 0.15)",
              borderRadius: 999, padding: "6px 14px",
              fontSize: "0.8rem", fontWeight: 700, color: "var(--green)",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block", boxShadow: "0 0 6px rgba(5, 150, 105, 0.4)" }} />
              Operational
            </div>
            <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
              <button className="btn-brutal" style={{ padding: "7px 18px", fontSize: "0.85rem", boxShadow: "0 2px 8px rgba(29, 78, 216, 0.15)" }}>
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
        height: 60, background: "var(--surface)", borderTop: "1.5px solid var(--border)",
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
                color: active ? "var(--blue)" : "var(--text-muted)",
              }}>
                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{n.icon}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: active ? 700 : 500, textTransform: "none" }}>
                  {n.label}
                </span>
                {active && (
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--blue)" }} />
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
            color: "var(--text-muted)",
          }}
        >
          <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>⋯</span>
          <span style={{ fontSize: "0.6rem", fontWeight: 500, textTransform: "none" }}>More</span>
        </button>
      </nav>

      {/* Responsive styles via a style tag */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(-100%);
            border-right: 1.5px solid var(--border) !important;
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
