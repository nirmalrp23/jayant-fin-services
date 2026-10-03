import {
  pageContext,
  requirePermission,
  cleanSearch,
} from "@/lib/page-context";
import { Heading, Search, Pagination, Empty } from "@/components/page-parts";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const c = await pageContext(searchParams);
  requirePermission(c, "audit.view");
  let query = c.db
    .from("audit_logs")
    .select("*,profiles!audit_logs_actor_id_fkey(full_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(c.from, c.to);
  if (c.branch) query = query.eq("branch_id", c.branch);
  if (c.q.q) query = query.ilike("action", `%${cleanSearch(c.q.q)}%`);
  const { data, count, error } = await query;
  if (error) throw error;
  return (
    <>
      <Heading
        title="Audit log"
        description="A trusted record of administrative changes within your access."
      />
      <Search
        branch={c.branch}
        placeholder="Search by action…"
        status={false}
      />
      <section className="panel !p-0">
        {data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Branch</th>
                  <th>Change details</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td className="text-xs">
                      {new Date(a.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19)}
                    </td>
                    <td>{a.profiles?.full_name ?? "System / restricted"}</td>
                    <td>
                      <code className="text-xs">{a.action}</code>
                    </td>
                    <td>
                      {c.branches.find((b) => b.id === a.branch_id)?.name ??
                        "Account-wide"}
                    </td>
                    <td>
                      <details>
                        <summary className="text-brand-700">Details</summary>
                        <div className="max-w-sm whitespace-pre-wrap break-all text-xs mt-3">
                          Target: {a.target_id}
                          <br />
                          {JSON.stringify(a.details, null, 2)}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No audit events within your current access." />
        )}
      </section>
      <Pagination count={count ?? 0} page={c.page} params={c.q} />
    </>
  );
}
