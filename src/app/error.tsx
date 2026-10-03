"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="panel m-8">
      <h1>Unable to load this page</h1>
      <p className="my-5">
        Check your connection and try again. Contact your administrator if this
        continues.
      </p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
