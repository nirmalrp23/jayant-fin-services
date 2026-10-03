import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { configured } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your branch workspace."
    >
      {q.changed && (
        <p role="status" className="mb-5 text-brand-700">
          Password updated. Sign in with your new password.
        </p>
      )}
      {q.error && (
        <p className="error mb-5">
          This recovery link is invalid or expired. Request a new link.
        </p>
      )}
      <AuthForm mode="login" configured={configured()} />
    </AuthShell>
  );
}
