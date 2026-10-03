export const dynamic = "force-dynamic";
import { identity } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
export default async function Page() {
  await identity(true);
  return (
    <AuthShell
      title="Set a new password"
      description="Choose a password only you know. A password change is required before you can continue to your workspace. You’ll sign in again afterwards."
    >
      <AuthForm mode="password" />
    </AuthShell>
  );
}
