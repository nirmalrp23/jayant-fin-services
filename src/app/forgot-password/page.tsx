import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
export default function Page() {
  return (
    <AuthShell
      title="Reset your password"
      description="We’ll send a recovery link to your work email."
    >
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
