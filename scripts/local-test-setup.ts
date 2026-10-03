/** Disposable local identities only. Never run against a hosted backend. */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
if (existsSync(".env.local"))
  throw new Error(
    "Refusing to overwrite .env.local. Use the existing local configuration or move it aside yourself.",
  );
const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);
if (status.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Local Supabase URL required");
const db = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const email = "e2e-admin@jn.local",
  password = `Local!${randomBytes(20).toString("hex")}9Aa`;
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error || !data.user) throw error;
const result = await db.rpc("bootstrap_super_admin", {
  target: data.user.id,
  display_name: "Local Test Administrator",
  account_email: email,
});
if (result.error) {
  await db.auth.admin.deleteUser(data.user.id);
  throw result.error;
}
const values = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  APP_ORIGIN: "http://localhost:3000",
  RATE_LIMIT_SECRET: randomBytes(32).toString("hex"),
  E2E_ADMIN_EMAIL: email,
  E2E_ADMIN_PASSWORD: password,
  E2E_FIRST_LOGIN: "1",
};
writeFileSync(
  ".env.local",
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Disposable local administrator and .env.local created. Credentials were not printed.",
);
