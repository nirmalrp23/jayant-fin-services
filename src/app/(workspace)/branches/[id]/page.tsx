import Link from "next/link";
import { notFound } from "next/navigation";
import { pageContext } from "@/lib/page-context";
import { can } from "@/lib/access";
import { Heading, Status, Empty, Pagination } from "@/components/page-parts";
import { CommandForm, type Field } from "@/components/command-form";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params,
    c = await pageContext(searchParams);
  const b = c.branches.find((b) => b.id === id);
  if (!b) notFound();
  const { data: members, count } = await c.db
    .from("memberships")
    .select("*,profiles!memberships_user_id_fkey(full_name)", {
      count: "exact",
    })
    .eq("branch_id", id)
    .order("created_at")
    .range(c.from, c.to);
  const fields: Field[] = [
    { name: "name", label: "Branch name", required: true, value: b.name },
    { name: "code", label: "Branch code", required: true, value: b.code },
  ];
  if (c.access.globalRole)
    fields.push({
      name: "active",
      label: "Branch active",
      type: "checkbox",
      value: b.active,
    });
  return (
    <>
      <Heading title={b.name} description={`${b.code} · Branch workspace`} />
      <Status active={b.active} />
      {can(c.access, id, "branches.edit") && (
        <details className="panel mt-6">
          <summary className="font-semibold">Edit branch</summary>
          <div className="mt-5 max-w-lg">
            <CommandForm
              operation="branch.save"
              hidden={{ id }}
              fields={fields}
            />
          </div>
        </details>
      )}
      <section className="panel mt-6">
        <div className="flex justify-between mb-5">
          <h2>Memberships & Managers</h2>
          {can(c.access, id, "users.create") && (
            <Link
              className="text-brand-700"
              href={`/users?branch=${id}#create`}
            >
              Create user →
            </Link>
          )}
        </div>
        {members?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Branch authority</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.profiles?.full_name ?? "Staff member"}</td>
                    <td>{m.is_manager ? "Manager" : "User"}</td>
                    <td>
                      <Status active={m.active} />
                    </td>
                    <td>
                      {can(c.access, id, "users.view") && (
                        <Link
                          className="text-brand-700"
                          href={`/users/${m.user_id}?branch=${id}`}
                        >
                          View / edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <Pagination count={count ?? 0} page={c.page} params={c.q} />
      </section>
    </>
  );
}
