import { context } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace-shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await context();
  const keys = Object.values(c.access.permissions).flat();
  const links = ["dashboard", "branches", "profile"];
  if (c.access.globalRole || keys.includes("users.view")) links.push("users");
  if (c.access.globalRole || keys.includes("roles.manage")) links.push("roles");
  if (
    c.access.globalRole ||
    c.access.memberships.some(
      (m) =>
        m.is_manager &&
        (c.access.permissions[m.branch_id] ?? []).includes("audit.view"),
    )
  )
    links.push("audit");
  return (
    <WorkspaceShell
      name={c.profile.full_name}
      role={
        c.access.globalRole ??
        (c.access.memberships.some((m) => m.is_manager) ? "manager" : "user")
      }
      branches={c.branches}
      links={links}
    >
      {children}
    </WorkspaceShell>
  );
}
