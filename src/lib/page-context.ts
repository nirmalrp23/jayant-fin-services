import { context } from "./auth";
import { notFound, redirect } from "next/navigation";
export async function pageContext(
  params: Promise<Record<string, string | string[] | undefined>>,
) {
  const c = await context();
  const raw = await params;
  const q: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw))
    if (typeof value === "string") q[key] = value;
  const branch = q.branch;
  if (branch && !c.branches.some((b) => b.id === branch)) notFound();
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(q.page ?? "1") || 1),
  );
  return { ...c, q, branch, page, from: (page - 1) * 20, to: page * 20 - 1 };
}
export function requirePermission(
  c: {
    access: {
      globalRole: string | null;
      permissions: Record<string, string[]>;
    };
    branch?: string;
  },
  permission: string,
) {
  if (
    !c.access.globalRole &&
    !(c.branch
      ? c.access.permissions[c.branch]?.includes(permission)
      : Object.values(c.access.permissions).some((p) => p.includes(permission)))
  )
    redirect("/access-denied");
}
export function cleanSearch(q?: string) {
  return (q ?? "").replace(/[%_,()]/g, "").slice(0, 100);
}
