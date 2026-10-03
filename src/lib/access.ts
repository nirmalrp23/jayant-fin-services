export type Membership = {
  id: string;
  user_id: string;
  branch_id: string;
  is_manager: boolean;
  active: boolean;
};
export type Access = {
  id: string;
  globalRole: "super_admin" | "admin" | null;
  memberships: Membership[];
  permissions: Record<string, string[]>;
};
export function can(
  access: Access,
  branch: string | undefined,
  permission: string,
) {
  return (
    !!access.globalRole ||
    (!!branch && (access.permissions[branch] ?? []).includes(permission))
  );
}
export function isManager(access: Access, branch: string) {
  return (
    !!access.globalRole ||
    access.memberships.some(
      (m) => m.branch_id === branch && m.active && m.is_manager,
    )
  );
}
export function canDelegate(
  access: Access,
  branch: string,
  permissions: string[],
) {
  return (
    !!access.globalRole || permissions.every((p) => can(access, branch, p))
  );
}
export function mayManageAccount(
  access: Access,
  target: string,
  roles: { user_id: string }[],
  memberships: Membership[],
  permission: string,
) {
  if (access.globalRole === "super_admin") return true;
  if (roles.some((r) => r.user_id === target)) return false;
  if (access.globalRole === "admin") return true;
  const ms = memberships.filter((m) => m.user_id === target);
  return (
    target !== access.id &&
    ms.length > 0 &&
    ms.every(
      (m) =>
        !m.is_manager &&
        isManager(access, m.branch_id) &&
        can(access, m.branch_id, permission),
    )
  );
}
