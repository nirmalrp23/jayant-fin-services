import Link from "next/link";
import { Building2, Users, ShieldCheck, ArrowUpRight } from "lucide-react";
import { pageContext } from "@/lib/page-context";
import { Heading, Status, Empty } from "@/components/page-parts";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const c = await pageContext(searchParams);
  let people = c.db
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  if (c.branch) people = people.eq("branch_id", c.branch);
  const result = await people;
  const branches = c.branches.filter((b) => !c.branch || b.id === c.branch);
  const roles = c.roles.filter((r) => !c.branch || r.branch_id === c.branch);
  return (
    <>
      <Heading
        tag="Workspace overview"
        title={`Welcome, ${c.profile.full_name.split(" ")[0]}`}
        description="A clear view of your branches, people and access."
      />
      <div className="dashboard-banner">
        <div>
          <p className="eyebrow">YOUR WORKSPACE, CONNECTED</p>
          <h2>Strong teams start with the right access.</h2>
          <p className="mt-2 text-stone-300 text-sm">
            Manage your branch network from one secure place.
          </p>
        </div>
        <ShieldCheck className="hidden sm:block text-brand-300" size={48} />
      </div>
      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        {[
          {
            label: "Accessible branches",
            value: branches.filter((b) => b.active).length,
            Icon: Building2,
          },
          {
            label: "Visible active memberships",
            value: result.count ?? 0,
            Icon: Users,
          },
          {
            label: "Active branch roles",
            value: roles.length,
            Icon: ShieldCheck,
          },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="panel metric-card">
            <div className="flex justify-between gap-3">
              <span className="metric-label">{label}</span>
              <Icon size={20} className="text-brand-700" />
            </div>
            <p className="metric-value">{value}</p>
            <p className="metric-footnote">Within your current access</p>
          </div>
        ))}
      </div>
      <section className="panel !p-0">
        <div className="network-header">
          <div>
            <h2>Your branch network</h2>
            <p className="text-sm muted mt-1">
              Select a branch to open its workspace.
            </p>
          </div>
          <Link href="/branches" className="text-brand-700 flex gap-2 text-sm">
            View branches <ArrowUpRight size={16} />
          </Link>
        </div>
        {branches.length ? (
          <>
            <div className="table-wrap branch-desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      <td className="font-semibold">{b.name}</td>
                      <td className="muted">{b.code}</td>
                      <td>
                        <Status active={b.active} />
                      </td>
                      <td>
                        <Link
                          href={`/branches/${b.id}?branch=${b.id}`}
                          className="text-brand-700"
                        >
                          Open branch →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="branch-cards">
              {branches.map((b) => (
                <div key={b.id} className="branch-card">
                  <div>
                    <p className="branch-card-name">{b.name}</p>
                    <p className="branch-card-code">{b.code}</p>
                  </div>
                  <div className="branch-card-end">
                    <Status active={b.active} />
                    <Link
                      href={`/branches/${b.id}?branch=${b.id}`}
                      aria-label={`Open ${b.name}`}
                    >
                      Open branch →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty text="No branches assigned yet. Contact your administrator." />
        )}
      </section>
    </>
  );
}
