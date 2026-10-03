import { Logout } from "@/components/auth-form";
export default function Page() {
  return (
    <main id="main" className="max-w-lg mx-auto p-12">
      <h1>Access denied</h1>
      <p className="my-6 muted">
        Your account is inactive or you do not have access to this area. Contact
        your administrator.
      </p>
      <Logout />
    </main>
  );
}
