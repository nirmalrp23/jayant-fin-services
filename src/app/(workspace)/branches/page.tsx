import Link from "next/link";
import { pageContext, cleanSearch } from "@/lib/page-context";
import {
  Heading,
  Search,
  Pagination,
  Status,
  Empty,
} from "@/components/page-parts";
import { CommandForm } from "@/components/command-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const c = await pageContext(searchParams);
  let query = c.db
    .from("branches")
    .select("*", { count: "exact" })
    .order("name")
    .range(c.from, c.to);
  if (c.branch) query = query.eq("id", c.branch);
  if (c.q.q) query = query.ilike("name", `%${cleanSearch(c.q.q)}%`);
  if (c.q.status) query = query.eq("active", c.q.status === "active");
  const { data, count, error } = await query;
  if (error) throw error;
  return (
    <>
      <Heading
        title="Branches"
        description="Manage your network and keep every branch connected."
      />
      <Search branch={c.branch} />
      <section className="panel !p-0">
        {data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Branch name</th>
                  <th>Branch code</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id}>
                    <td className="font-semibold">{b.name}</td>
                    <td>{b.code}</td>
                    <td>
                      <Status active={b.active} />
                    </td>
                    <td>
                      <Link
                        className="text-brand-700"
                        href={`/branches/${b.id}?branch=${b.id}`}
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
      {c.access.globalRole && (
        <details className="panel mt-8">
          <summary className="font-semibold">Create a branch</summary>
          <div className="max-w-lg mt-6">
            <CommandForm
              operation="branch.save"
              submit="Create branch"
              fields={[
                { name: "name", label: "Branch name", required: true },
                {
                  name: "code",
                  label: "Branch code",
                  required: true,
                  hint: "2–20 letters, numbers or hyphens. For example, JN-001.",
                },
              ]}
            />
          </div>
        </details>
      )}
    </>
  );
}
