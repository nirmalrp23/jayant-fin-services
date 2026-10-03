import Link from "next/link";
import { context } from "@/lib/auth";
import { Heading } from "@/components/page-parts";
import { CommandForm } from "@/components/command-form";
export default async function Page() {
  const c = await context();
  return (
    <>
      <Heading
        title="My profile"
        description="Your account information and security settings."
      />
      <div className="grid xl:grid-cols-2 gap-6">
        <section className="panel">
          <h2 className="mb-5">Personal information</h2>
          <p className="mb-5 muted">{c.profile.email}</p>
          <CommandForm
            operation="profile.save"
            fields={[
              {
                name: "full_name",
                label: "Full name",
                required: true,
                value: c.profile.full_name,
              },
            ]}
          />
        </section>
        <section className="panel">
          <h2>Account security</h2>
          <p className="my-5 muted">
            Use a unique password for your JN Fin Services account. Changing it
            signs you out of all sessions.
          </p>
          <Link
            href="/change-password"
            className="text-brand-700 font-semibold"
          >
            Change password →
          </Link>
        </section>
        <section id="install" className="panel">
          <h2>Install JN Fin Services</h2>
          <p className="mt-5 leading-7 muted">
            On Chrome or Edge, use the install icon in the address bar or choose
            “Install app” from the browser menu. On iPhone or iPad, open this
            site in Safari, tap Share, then “Add to Home Screen”. Installation
            requires HTTPS on a deployed site.
          </p>
          <p className="mt-4 text-sm muted">
            An internet connection is required for staff work. Account data is
            never stored for offline use.
          </p>
        </section>
      </div>
    </>
  );
}
