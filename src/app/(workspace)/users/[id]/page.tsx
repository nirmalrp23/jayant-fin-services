import { notFound } from "next/navigation";
import { pageContext, requirePermission } from "@/lib/page-context";
import { canDelegate } from "@/lib/access";
import { Heading, Status, Empty } from "@/components/page-parts";
import { CommandForm, type Field } from "@/components/command-form";
import { adminClient } from "@/lib/supabase/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params,
    c = await pageContext(searchParams);
  requirePermission(c, "users.view");
  const { data: p } = await c.db
    .from("profiles")
    .select("id,full_name,email,active")
    .eq("id", id)
    .single();
  if (!p) notFound();
  const [members, mappings, assignments] = await Promise.all([
    c.db.from("memberships").select("*").eq("user_id", id),
    c.db.from("role_permissions").select("*"),
    c.db.from("membership_roles").select("*"),
  ]);
  // Read only a capability boolean from trusted DB checks; do not leak other branches' memberships.
  const { data: caps } = await adminClient().rpc("account_capabilities", {
    actor: c.user.id,
    target: id,
  });
  const { data: targetSystemRole } = await c.db
    .from("system_roles")
    .select("role")
    .eq("user_id", id)
    .eq("active", true)
    .maybeSingle();
  const fields: Field[] = [
    {
      name: "full_name",
      label: "Full name",
      required: true,
      value: p.full_name,
    },
  ];
  if (caps?.deactivate)
    fields.push({
      name: "active",
      label: "Account active",
      type: "checkbox",
      value: p.active,
    });
  const b = c.branch;
  const ms = members.data?.find((m) => m.branch_id === b);
  const roleOptions = c.roles
    .filter(
      (r) =>
        r.branch_id === b &&
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
  const membershipFields: Field[] = [
    {
      name: "role_ids",
      label: "Branch roles (permissions are additive)",
      type: "checks",
      options: roleOptions,
      value:
        assignments.data
          ?.filter((a) => a.membership_id === ms?.id)
          .map((a) => a.role_id) ?? [],
    },
    {
      name: "active",
      label: "Membership active",
      type: "checkbox",
      value: ms?.active ?? true,
    },
  ];
  if (c.access.globalRole)
    membershipFields.push({
      name: "is_manager",
      label: "Manager authority in this branch",
      type: "checkbox",
      value: ms?.is_manager ?? false,
    });
  const mayMembership = b
    ? (
        await adminClient().rpc("membership_capability", {
          actor: c.user.id,
          target: id,
          branch: b,
        })
      ).data === true
    : false;
  return (
    <>
      <Heading title={p.full_name} description={p.email} />
      <Status active={p.active} />
      <div className="grid xl:grid-cols-2 gap-6 mt-6">
        <section className="panel">
          <h2 className="mb-5">Account details</h2>
          {caps?.edit ? (
            <CommandForm
              operation="account.save"
              hidden={{ id }}
              fields={fields}
            />
          ) : (
            <p className="muted">
              You can view this account. Account-wide changes require authority
              over all its memberships.
            </p>
          )}
          {caps?.reset && id !== c.user.id && (
            <details className="mt-8 border-t pt-5">
              <summary className="font-semibold">
                Reset temporary password
              </summary>
              <p className="my-4 muted">
                This restricts all sessions until a new password is set.
              </p>
              <CommandForm
                operation="account.reset"
                hidden={{ id }}
                fields={[]}
                submit="Generate temporary password"
              />
            </details>
          )}
        </section>
        <section className="panel">
          <h2 className="mb-4">Branch memberships</h2>
          {members.data?.length ? (
            members.data.map((m) => (
              <div key={m.id} className="py-4 border-b border-stone-100">
                <p className="font-semibold">
                  {c.branches.find((b) => b.id === m.branch_id)?.name ??
                    "Branch"}
                </p>
                <p className="my-2 muted">
                  {m.is_manager ? "Manager" : "User"} ·{" "}
                  {assignments.data
                    ?.filter((a) => a.membership_id === m.id)
                    .map((a) => c.roles.find((r) => r.id === a.role_id)?.name)
                    .filter(Boolean)
                    .join(", ") || "No active roles"}
                </p>
                <Status active={m.active} />
              </div>
            ))
          ) : (
            <Empty text="No visible branch memberships." />
          )}
        </section>
      </div>
      {mayMembership && (
        <section className="panel mt-6">
          <h2 className="mb-5">
            {ms ? "Edit" : "Add"} membership ·{" "}
            {c.branches.find((x) => x.id === b)?.name}
          </h2>
          <CommandForm
            key={b}
            operation="membership.save"
            hidden={{
              id,
              branch_id: b,
              ...(!c.access.globalRole ? { is_manager: false } : {}),
            }}
            fields={membershipFields}
          />
        </section>
      )}
      {!b && (
        <p className="mt-6 muted">
          Select a branch to add or edit a membership.
        </p>
      )}
      {c.access.globalRole === "super_admin" && (
        <details className="panel mt-6">
          <summary className="font-semibold">Global system authority</summary>
          <div className="mt-5 max-w-lg">
            <CommandForm
              operation="system.assign"
              hidden={{ id }}
              fields={[
                {
                  name: "system_role",
                  label: "Global role",
                  value: targetSystemRole?.role ?? "none",
                  type: "select",
                  required: true,
                  options: [
                    { value: "none", label: "No global authority" },
                    { value: "admin", label: "Admin" },
                    { value: "super_admin", label: "Super Admin" },
                  ],
                },
              ]}
            />
          </div>
        </details>
      )}
    </>
  );
}
