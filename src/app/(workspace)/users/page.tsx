import Link from "next/link";
import {
  pageContext,
  requirePermission,
  cleanSearch,
} from "@/lib/page-context";
import { can, isManager, canDelegate } from "@/lib/access";
import {
  Heading,
  Search,
  Pagination,
  Status,
  Empty,
} from "@/components/page-parts";
import { CommandForm, type Field } from "@/components/command-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const c = await pageContext(searchParams);
  requirePermission(c, "users.view");
  let query = c.db
    .from("profiles")
    .select(
      c.branch
        ? "id,full_name,email,active,must_change_password,memberships!memberships_user_id_fkey!inner(branch_id)"
        : "id,full_name,email,active,must_change_password",
      { count: "exact" },
    )
    .order("full_name")
    .range(c.from, c.to);
  if (c.branch) query = query.eq("memberships.branch_id", c.branch);
  if (c.q.q) query = query.ilike("full_name", `%${cleanSearch(c.q.q)}%`);
  if (c.q.status) query = query.eq("active", c.q.status === "active");
  const { data, count, error } = await query;
  if (error) throw error;
  const mappings = await c.db
    .from("role_permissions")
    .select("role_id,permission_id");
  const roleOptions = c.roles
    .filter(
      (r) =>
        r.branch_id === c.branch &&
        canDelegate(
          c.access,
          r.branch_id,
          c.permissions
            .filter((p) =>
              mappings.data?.some(
                (x) => x.role_id === r.id && x.permission_id === p.id,
              ),
            )
            .map((p) => p.key),
        ),
    )
    .map((r) => ({ value: r.id, label: r.name }));
  const fields: Field[] = [
    { name: "full_name", label: "Full name", required: true },
    { name: "email", label: "Work email", type: "email", required: true },
  ];
  if (c.branch)
    fields.push({
      name: "role_id",
      label: "Branch role",
      type: "select",
      required: true,
      options: roleOptions,
    });
  if (c.access.globalRole && c.branch)
    fields.push({
      name: "is_manager",
      label: "Manager authority in this branch",
      type: "checkbox",
    });
  if (c.access.globalRole === "super_admin")
    fields.push({
      name: "system_role",
      label: "Global authority",
      type: "select",
      required: true,
      value: "none",
      options: [
        { value: "none", label: "None (branch access only)" },
        { value: "admin", label: "Admin" },
        { value: "super_admin", label: "Super Admin" },
      ],
    });
  const create =
    !!c.access.globalRole ||
    (!!c.branch &&
      isManager(c.access, c.branch) &&
      ["users.create", "memberships.manage", "roles.assign"].every((p) =>
        can(c.access, c.branch, p),
      ));
  // Query strings above differ only in the optional membership join; common columns are stable.
  const rows = (data ?? []) as unknown as {
    id: string;
    full_name: string;
    email: string;
    active: boolean;
    must_change_password: boolean;
  }[];
  return (
    <>
      <Heading
        title="People"
        description="Manage staff accounts and branch access."
      />
      <Search branch={c.branch} />
      <section className="panel !p-0">
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Work email</th>
                  <th>Status</th>
                  <th>Password</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.full_name}</td>
                    <td className="muted">{p.email}</td>
                    <td>
                      <Status active={p.active} />
                    </td>
                    <td className="text-xs muted">
                      {p.must_change_password ? "Change required" : "Set"}
                    </td>
                    <td>
                      <Link
                        className="text-brand-700"
                        href={`/users/${p.id}${c.branch ? "?branch=" + c.branch : ""}`}
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
      <Pagination count={count ?? 0} page={c.page} params={c.q} />
      {create ? (
        <details id="create" className="panel mt-8">
          <summary className="font-semibold">Create staff account</summary>
          <p className="my-5 muted">
            {c.branch
              ? "The account will receive access to the selected branch."
              : "Select a branch above to add branch access during creation."}{" "}
            A temporary password will be shown once.
          </p>
          <div className="max-w-lg">
            <CommandForm
              operation="account.create"
              hidden={c.branch ? { branch_id: c.branch } : {}}
              fields={fields}
              submit="Create account"
            />
          </div>
        </details>
      ) : (
        !c.branch && (
          <p className="mt-8 muted">Select a branch to manage its staff.</p>
        )
      )}
    </>
  );
}
