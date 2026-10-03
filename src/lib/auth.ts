import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionClient, configured } from "./supabase/server";
import type { Access, Membership } from "./access";
export async function identity(allowPasswordChange = false) {
  if (!configured()) redirect("/login");
  const db = await sessionClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await db
    .from("profiles")
    .select("id,full_name,email,active,must_change_password")
    .eq("id", user.id)
    .single();
  if (!profile?.active) redirect("/access-denied");
  if (profile.must_change_password && !allowPasswordChange)
    redirect("/change-password");
  return { db, user, profile };
}
export const context = cache(async function context() {
  const { db, user, profile } = await identity();
  const [
    branches,
    role,
    memberships,
    roles,
    mappings,
    assignments,
    permissions,
  ] = await Promise.all([
    db.from("branches").select("*").order("name"),
    db
      .from("system_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
    db
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true),
    db.from("branch_roles").select("*").eq("active", true),
    db.from("role_permissions").select("*"),
    db.from("membership_roles").select("*"),
    db.from("permissions").select("*"),
  ]);
  for (const response of [
    branches,
    role,
    memberships,
    roles,
    mappings,
    assignments,
    permissions,
  ])
    if (response.error) throw new Error("Unable to load access configuration");
  const access: Access = {
    id: user.id,
    globalRole: role.data?.role ?? null,
    memberships: (memberships.data ?? []) as Membership[],
    permissions: {},
  };
  for (const m of access.memberships) {
    if (!branches.data?.some((b) => b.id === m.branch_id && b.active)) continue;
    const roleIds =
      assignments.data
        ?.filter(
          (a) =>
            a.membership_id === m.id &&
            roles.data?.some((r) => r.id === a.role_id),
        )
        .map((a) => a.role_id) ?? [];
    const pids =
      mappings.data
        ?.filter((p) => roleIds.includes(p.role_id))
        .map((p) => p.permission_id) ?? [];
    access.permissions[m.branch_id] =
      permissions.data?.filter((p) => pids.includes(p.id)).map((p) => p.key) ??
      [];
  }
  return {
    db,
    user,
    profile,
    access,
    branches: branches.data ?? [],
    roles: roles.data ?? [],
    permissions: permissions.data ?? [],
  };
});
