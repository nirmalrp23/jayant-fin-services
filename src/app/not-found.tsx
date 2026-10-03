import Link from "next/link";
export default function Page() {
  return (
    <main id="main" className="max-w-lg mx-auto p-12">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="my-6 muted">The requested page is unavailable.</p>
      <Link href="/dashboard">Return to workspace</Link>
    </main>
  );
}
