import {
  pageContext,
  requirePermission,
  cleanSearch,
} from "@/lib/page-context";
import { can, canDelegate, isManager } from "@/lib/access";
import {
  Heading,
  Search,
  Pagination,
  Status,
  Empty,
} from "@/components/page-parts";
import { CommandForm } from "@/components/command-form";
import { adminClient } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const c = await pageContext(searchParams);
  requirePermission(c, "roles.manage");
  let query = c.db
    .from("branch_roles")
    .select("*", { count: "exact" })
    .order("name")
    .range(c.from, c.to);
  if (c.branch) query = query.eq("branch_id", c.branch);
  if (c.q.q) query = query.ilike("name", `%${cleanSearch(c.q.q)}%`);
  if (c.q.status) query = query.eq("active", c.q.status === "active");
  const { data, count, error } = await query;
  if (error) throw error;
  const { data: maps } = await c.db.from("role_permissions").select("*");
  const editable = new Set<string>();
  await Promise.all(
    (data ?? []).map(async (r) => {
      const result = await adminClient().rpc("role_capability", {
        actor: c.user.id,
        target: r.id,
      });
      if (result.data === true) editable.add(r.id);
    }),
  );
  const options = (b: string) =>
    c.permissions
      .filter((p) => canDelegate(c.access, b, [p.key]))
      .map((p) => ({ value: p.key, label: p.description }));
  return (
    <>
      <Heading
        title="Roles & permissions"
        description="Branch roles define what people can do. They never grant global authority."
      />
      <Search branch={c.branch} />
      <div className="grid xl:grid-cols-2 gap-5">
        {data?.map((r) => {
          const selected = c.permissions
            .filter((p) =>
              maps?.some((m) => m.role_id === r.id && m.permission_id === p.id),
            )
            .map((p) => p.key);
          return (
            <section className="panel" key={r.id}>
              <div className="flex justify-between">
                <h2>{r.name}</h2>
                <Status active={r.active} />
              </div>
              <p className="mt-1 mb-5 muted">
                {c.branches.find((b) => b.id === r.branch_id)?.name}
              </p>
              <p className="text-xs leading-6 muted">
                {selected.join(" · ") || "No permissions assigned"}
              </p>
              {editable.has(r.id) && (
                <details className="mt-5">
                  <summary className="text-brand-700 font-semibold">
                    Edit role
                  </summary>
                  <div className="mt-5">
                    <CommandForm
                      operation="role.save"
                      hidden={{ id: r.id, branch_id: r.branch_id }}
                      fields={[
                        {
                          name: "name",
                          label: "Role name",
                          required: true,
                          value: r.name,
                        },
                        {
                          name: "active",
                          label: "Role active",
                          type: "checkbox",
                          value: r.active,
                        },
                        {
                          name: "permissions",
                          label: "Permissions",
                          type: "checks",
                          value: selected,
                          options: options(r.branch_id),
                        },
                      ]}
                    />
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
      {!data?.length && <Empty />}
      <Pagination count={count ?? 0} page={c.page} params={c.q} />
      {c.branch &&
        isManager(c.access, c.branch) &&
        can(c.access, c.branch, "roles.manage") && (
          <details className="panel mt-6">
            <summary className="font-semibold">
              Create custom branch role
            </summary>
            <div className="mt-5">
              <CommandForm
                operation="role.save"
                hidden={{ branch_id: c.branch }}
                fields={[
                  { name: "name", label: "Role name", required: true },
                  {
                    name: "permissions",
                    label: "Permissions",
                    type: "checks",
                    options: options(c.branch),
                  },
                ]}
              />
            </div>
          </details>
        )}
      {!c.branch && (
        <p className="mt-6 muted">Select a branch to create a custom role.</p>
      )}
    </>
  );
}
