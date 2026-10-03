import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    BOOTSTRAP_EMAIL: z.email(),
    BOOTSTRAP_PASSWORD: z.string().min(12).max(128),
    BOOTSTRAP_NAME: z.string().min(1).default("JN Administrator"),
  })
  .parse(process.env);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const email = env.BOOTSTRAP_EMAIL.toLowerCase();
const { data: existing, error: readError } = await db
  .from("profiles")
  .select("id")
  .eq("email", email)
  .maybeSingle();
if (readError) throw readError;
if (existing) {
  console.log("Account already provisioned; credentials were not changed.");
  process.exit(0);
}
const { data: global } = await db
  .from("system_roles")
  .select("id")
  .eq("role", "super_admin")
  .limit(1);
if (global?.length)
  throw new Error(
    "A Super Admin already exists. Use the application to create additional accounts.",
  );
// Existing unprovisioned auth accounts are never adopted or overwritten.
const { data, error } = await db.auth.admin.createUser({
  email,
  password: env.BOOTSTRAP_PASSWORD,
  email_confirm: true,
});
if (error || !data.user)
  throw new Error(
    "Account creation failed. Check whether this email already exists in Auth.",
  );
const { error: provisionError } = await db.rpc("bootstrap_super_admin", {
  target: data.user.id,
  display_name: env.BOOTSTRAP_NAME,
  account_email: email,
});
if (provisionError) {
  const rollback = await db.auth.admin.deleteUser(data.user.id);
  if (rollback.error)
    console.error("Remove orphan Auth account manually:", data.user.id);
  throw provisionError;
}
console.log(
  "First Super Admin created. A password change is required on first login.",
);
