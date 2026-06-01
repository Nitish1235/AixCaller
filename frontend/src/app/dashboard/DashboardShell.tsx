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

/* ─── SVG Icon library ───────────────────────────────────────────── */
const IC = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  agents: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="10" rx="2"/>
      <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/>
      <path d="M4 13H2m20 0h-2"/>
    </svg>
  ),
  callflow: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91"/>
      <path d="M15 3h6m0 0v6m0-6-7 7"/>
    </svg>
  ),
  calls: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15.5 15.5"/>
    </svg>
  ),
  campaigns: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  ),
  leads: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  knowledge: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  integrations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2h3v3.5L17 9l2.5-1.5 2.5 2.5L20.5 12.5 17 16h-3.5v3h-3v-3H7L3.5 12.5 2 10l2.5-2.5L7 9l3.5-3.5V2z"/>
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

/* ─── Nav config ─────────────────────────────────────────────────── */
const NAV_MAIN = [
  { href: "/dashboard",           icon: IC.overview,      label: "Overview" },
  { href: "/dashboard/agents",    icon: IC.agents,        label: "Agents" },
];
const NAV_TOOLS = [
  { href: "/dashboard/call-flow",    icon: IC.callflow,     label: "Inbound Call Setup" },
  { href: "/dashboard/calls",        icon: IC.calls,        label: "Call History" },
  { href: "/dashboard/campaigns",    icon: IC.campaigns,    label: "Outbound Campaigns" },
  { href: "/dashboard/leads",        icon: IC.leads,        label: "Leads" },
  { href: "/dashboard/knowledge",    icon: IC.knowledge,    label: "Knowledge Base" },
  { href: "/dashboard/integrations", icon: IC.integrations, label: "Integrations" },
  { href: "/dashboard/billing",      icon: IC.billing,      label: "Billing" },
];

/* ─── Bottom-nav items (mobile, 5 slots) ─────────────────────────── */
const NAV_MOBILE = [
  { href: "/dashboard",              icon: IC.overview,   label: "Home" },
  { href: "/dashboard/agents",       icon: IC.agents,     label: "Agents" },
  { href: "/dashboard/calls",        icon: IC.calls,      label: "Calls" },
  { href: "/dashboard/campaigns",    icon: IC.campaigns,  label: "Campaigns" },
  { href: "/dashboard/leads",        icon: IC.leads,      label: "Leads" },
];

/* ─── NavItem ────────────────────────────────────────────────────── */
function NavItem({ href, icon, label, active, onClick }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }} onClick={onClick}>
      <div style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "7px 10px", borderRadius: 8,
        background: active ? "var(--sidebar-item-active-bg)" : "transparent",
        border: active ? "1px solid var(--sidebar-item-active-border)" : "1px solid transparent",
        color: active ? "var(--blue)" : "#374151",
        fontWeight: active ? 600 : 500,
        fontSize: "0.875rem",
        transition: "all 0.15s ease",
        cursor: "pointer",
        boxShadow: active ? "0 1px 3px rgba(29,78,216,0.08)" : "none",
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = "var(--sidebar-item-hover)";
          e.currentTarget.style.color = "#111827";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#374151";
        }
      }}
      >
        <span style={{ color: active ? "var(--blue)" : "#6b7280", flexShrink: 0, display: "flex", transition: "color 0.15s" }}>
          {icon}
        </span>
        {label}
      </div>
    </Link>
  );
}

/* ─── Shell ──────────────────────────────────────────────────────── */
export default function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname();
  const [billing, setBilling] = useState<{ minutes_left: number; minutes_included: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      apiGet(`/billing/subscription?tenant_id=${user.tenant_id}`)
        .then(data => setBilling(data))
        .catch(() => {});
    }
  }, [user?.tenant_id]);

  useEffect(() => { setSidebarOpen(false); }, [path]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const initials = user.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  const allNav = [...NAV_MAIN, ...NAV_TOOLS];
  const currentLabel = allNav.find(n => n.href === path)?.label ?? "Dashboard";

  const usagePct = billing && billing.minutes_included > 0
    ? Math.min(100, Math.max(0, (billing.minutes_left / billing.minutes_included) * 100))
    : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f8fa" }}>

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)",
            zIndex: 49,
          }}
        />
      )}

      {/* ═══ SIDEBAR ═══════════════════════════════════════════════ */}
      <aside
        className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          flexShrink: 0,
          background: "var(--sidebar-bg)",
          borderRight: "1.5px solid var(--sidebar-border)",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
          overflowY: "auto",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >

        {/* Brand */}
        <div style={{
          padding: "1.1rem 1.25rem",
          borderBottom: "1px solid #f0f0f0",
          background: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Logo size={36} showText={true} dark={false} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            style={{
              background: "none", border: "none", color: "#6b7280",
              cursor: "pointer", padding: "4px", lineHeight: 1,
              display: "flex", alignItems: "center", borderRadius: 6,
            }}
          >
            {IC.close}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1.25rem 0.875rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <div style={{
            fontSize: "0.6rem", fontWeight: 700, color: "#9ca3af",
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "0 10px", marginBottom: "0.35rem",
          }}>Main</div>
          {NAV_MAIN.map(n => (
            <NavItem key={n.href} {...n} active={path === n.href} onClick={() => setSidebarOpen(false)} />
          ))}

          <div style={{
            fontSize: "0.6rem", fontWeight: 700, color: "#9ca3af",
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "0 10px", margin: "1rem 0 0.35rem",
          }}>Tools</div>
          {NAV_TOOLS.map(n => (
            <NavItem key={n.href} {...n} active={path === n.href} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>

        {/* Usage card */}
        <div style={{ padding: "0 0.875rem 1rem" }}>
          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: "1px solid #bfdbfe",
            borderRadius: 12, padding: "1rem 1.1rem",
          }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Usage
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
              <span className="mono" style={{ fontWeight: 800, fontSize: "1.5rem", color: "#111827", lineHeight: 1 }}>
                {billing ? Math.floor(billing.minutes_left) : "—"}
              </span>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>min left</span>
            </div>
            <div style={{ height: 5, background: "#bfdbfe", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                width: `${usagePct}%`, height: "100%",
                background: "linear-gradient(90deg, #1d4ed8, #3b82f6)",
                borderRadius: 99, transition: "width 0.6s ease",
              }} />
            </div>
            <Link href="/dashboard/billing" style={{
              display: "block", textAlign: "center",
              fontSize: "0.78rem", color: "#1d4ed8", fontWeight: 600, textDecoration: "none",
            }}>
              Manage Plan →
            </Link>
          </div>
        </div>

        {/* User */}
        <div style={{
          padding: "0.875rem 1.1rem",
          borderTop: "1px solid #f0f0f0",
          background: "#ffffff",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {user.picture ? (
            <img src={user.picture} alt={user.name} width={32} height={32}
              style={{ borderRadius: "50%", flexShrink: 0, border: "1.5px solid #e5e7eb" }} />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: "#1d4ed8", fontSize: "0.8rem", flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name || "Workspace"}
            </div>
            <div className="mono" style={{ fontSize: "0.68rem", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
            </div>
          </div>
          <a
            href="/api/auth/logout"
            onClick={() => { if (typeof window !== "undefined") localStorage.removeItem("tenant_id"); }}
            title="Sign out"
            style={{ color: "#9ca3af", display: "flex", flexShrink: 0, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
          >
            {IC.logout}
          </a>
        </div>
      </aside>

      {/* ═══ MAIN AREA ══════════════════════════════════════════════ */}
      <div className="dashboard-main" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Top bar */}
        <header style={{
          height: 56, background: "#ffffff",
          borderBottom: "1px solid #f0f0f0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.5rem",
          position: "sticky", top: 0, zIndex: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="hamburger-btn"
              aria-label="Open navigation"
              style={{
                background: "none", border: "1px solid #e5e7eb",
                borderRadius: 7, padding: "6px 8px", cursor: "pointer",
                color: "#374151", display: "flex", alignItems: "center",
                transition: "all 0.15s",
              }}
            >
              {IC.menu}
            </button>
            <span style={{
              fontWeight: 700, fontSize: "0.95rem", color: "#111827",
              letterSpacing: "-0.01em",
            }}>
              {currentLabel}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Live status */}
            <div className="status-badge" style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 999, padding: "5px 11px",
              fontSize: "0.75rem", fontWeight: 600, color: "#059669",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#059669",
                display: "inline-block", boxShadow: "0 0 0 2px rgba(5,150,105,0.2)",
              }} />
              Live
            </div>

            {/* CTA */}
            <Link href="/dashboard/agents/create" style={{ textDecoration: "none" }}>
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#1d4ed8", color: "#fff", border: "none",
                borderRadius: 8, padding: "6px 14px",
                fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 3px 8px rgba(29,78,216,0.2)",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1e40af"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1d4ed8"; e.currentTarget.style.transform = "none"; }}
              >
                {IC.plus} New Agent
              </button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="dash-content" style={{ flex: 1 }}>{children}</div>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ══════════════════════════════════════ */}
      <nav className="mobile-bottom-nav" style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
        height: 60, background: "#ffffff", borderTop: "1px solid #f0f0f0",
        zIndex: 48, alignItems: "center", justifyContent: "space-around",
        padding: "0 4px",
      }}>
        {NAV_MOBILE.map(n => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href} style={{ textDecoration: "none", flex: 1 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3, padding: "6px 4px",
                color: active ? "#1d4ed8" : "#9ca3af",
              }}>
                {n.icon}
                <span style={{ fontSize: "0.58rem", fontWeight: active ? 700 : 500 }}>
                  {n.label}
                </span>
                {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1d4ed8" }} />}
              </div>
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "6px 4px",
            background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
          }}
        >
          {IC.menu}
          <span style={{ fontSize: "0.58rem", fontWeight: 500 }}>More</span>
        </button>
      </nav>

      {/* ─── Responsive styles ─── */}
      <style>{`
        .dashboard-sidebar { width: var(--sidebar-width); transform: translateX(0); }
        .dashboard-main { margin-left: var(--sidebar-width); }
        .hamburger-btn { display: none !important; }
        .sidebar-close-btn { display: none !important; }

        @media (max-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(-100%) !important;
            box-shadow: none;
          }
          .dashboard-sidebar.open {
            transform: translateX(0) !important;
            box-shadow: 6px 0 24px rgba(0,0,0,0.08);
          }
          .dashboard-main { margin-left: 0 !important; }
          .hamburger-btn { display: flex !important; }
          .sidebar-close-btn { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          .status-badge { display: none !important; }
        }
      `}</style>
    </div>
  );
}
