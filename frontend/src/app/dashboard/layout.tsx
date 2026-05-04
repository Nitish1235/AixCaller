// Server Component — reads user from middleware-injected headers
import { headers } from "next/headers";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const user = {
    email:   h.get("x-user-email")   || "user@example.com",
    name:    h.get("x-user-name")    || "My Workspace",
    picture: h.get("x-user-picture") || "",
    tenant_id: h.get("x-user-tenant-id") || "00000000-0000-0000-0000-000000000000",
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
