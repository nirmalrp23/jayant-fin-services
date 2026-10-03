import Link from "next/link";
export function Heading({
  title,
  description,
  tag = "Administration",
}: {
  title: string;
  description: string;
  tag?: string;
}) {
  return (
    <div className="mb-8">
      <p className="eyebrow mb-2">{tag}</p>
      <h1>{title}</h1>
      <p className="mt-2 muted">{description}</p>
    </div>
  );
}
export function Status({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? "" : "off"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}
export function Search({
  branch,
  placeholder = "Search by name…",
  status = true,
}: {
  branch?: string;
  placeholder?: string;
  status?: boolean;
}) {
  return (
    <form className="flex flex-wrap gap-3 mb-5" method="GET">
      {branch && <input type="hidden" name="branch" value={branch} />}
      <label className="sr-only" htmlFor="q">
        Search
      </label>
      <input id="q" name="q" placeholder={placeholder} className="sm:!w-72" />
      {status && (
        <>
          <label className="sr-only" htmlFor="status">
            Status
          </label>
          <select className="!w-auto" name="status" id="status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>
      )}
      <button className="rounded-lg border border-stone-300 px-5 bg-white">
        Search
      </button>
    </form>
  );
}
export function Pagination({
  count,
  page,
  params,
}: {
  count: number;
  page: number;
  params: Record<string, string>;
}) {
  const url = (n: number) =>
    "?" + new URLSearchParams({ ...params, page: String(n) });
  return (
    <div className="flex items-center justify-between mt-5 text-sm muted">
      <span>
        {count} result{count === 1 ? "" : "s"} · Page {page}
      </span>
      <div className="flex gap-5">
        {page > 1 && <Link href={url(page - 1)}>Previous</Link>}
        {page * 20 < count && <Link href={url(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}
export function Empty({
  text = "No records match your filters.",
}: {
  text?: string;
}) {
  return <p className="p-10 text-center muted">{text}</p>;
}
