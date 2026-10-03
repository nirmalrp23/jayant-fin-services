import { test, expect } from "@playwright/test";
test("login, recovery and public signup absence", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
});
test("business routes require authentication", async ({ page }) => {
  await page.goto("/users");
  await expect(page).toHaveURL(/\/login/);
});
test("mobile login remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByLabel("Work email")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("cross-origin mutation is rejected", async ({ request }) => {
  const response = await request.post("/api/command", {
    headers: { origin: "https://untrusted.example" },
    data: { operation: "branch.save", payload: { name: "X", code: "XX" } },
  });
  expect(response.status()).toBe(403);
});
test("manifest and generic offline fallback", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect((await response.json()).display).toBe("standalone");
  expect((await request.get("/offline.html")).status()).toBe(200);
});
test("administrator can create branch and temporary account", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "Requires a local bootstrapped administrator with completed password change.",
  );
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.E2E_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  if (process.env.E2E_FIRST_LOGIN === "1") {
    await expect(page).toHaveURL(/change-password/);
    await page
      .getByLabel("New password", { exact: true })
      .fill(process.env.E2E_ADMIN_PASSWORD! + "-Changed9!");
    await page
      .getByLabel("Confirm password")
      .fill(process.env.E2E_ADMIN_PASSWORD! + "-Changed9!");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/login\?changed=1/);
    await page.getByLabel("Work email").fill(process.env.E2E_ADMIN_EMAIL!);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.E2E_ADMIN_PASSWORD! + "-Changed9!");
    await page.getByRole("button", { name: "Sign in securely" }).click();
  }
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/branches");
  await page.getByText("Create a branch", { exact: true }).click();
  const code = `T${Date.now()}`;
  await page.getByLabel("Branch name", { exact: true }).fill(`Test ${code}`);
  await page.getByLabel("Branch code", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Create branch", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page
    .getByRole("row")
    .filter({ hasText: code })
    .getByRole("link", { name: "Manage" })
    .click();
  await page.getByRole("link", { name: "Create user" }).click();
  await page.getByText("Create staff account", { exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Browser Test User");
  await page
    .getByLabel("Work email", { exact: true })
    .fill(`${code.toLowerCase()}@example.test`);
  await page
    .getByLabel("Branch role", { exact: true })
    .selectOption({ label: "User" });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Temporary password — shown once")).toBeVisible();
  const temp = await page.locator("code").innerText();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByLabel("Work email")
    .fill(`${code.toLowerCase()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(temp);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/change-password/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/change-password/);
  const denied = await page.request.post("/api/command", {
    headers: { origin: "http://localhost:3000" },
    data: {
      operation: "profile.save",
      payload: { full_name: "Blocked change" },
    },
  });
  expect(denied.status()).toBe(400);
  expect((await denied.json()).error).toBe("Access denied");
  await page
    .getByLabel("New password", { exact: true })
    .fill("New-Secure-Password42!");
  await page.getByLabel("Confirm password").fill("New-Secure-Password42!");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/login\?changed=1/);
});

test("local Supabase rejects public registration", async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  test.skip(
    url !== "http://127.0.0.1:54321",
    "Only sends a registration probe to disposable local Supabase.",
  );
  const result = await request.post(`${url}/auth/v1/signup`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    data: {
      email: `blocked-${Date.now()}@example.test`,
      password: "Never-Created-Account9!",
    },
  });
  expect(result.status()).toBe(422);
  expect((await result.json()).error_code).toBe("signup_disabled");
});

test("password forms cannot submit before JavaScript is ready", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/login");
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  await expect(page.locator("form button")).toBeDisabled();
  await context.close();
});

test("administrator edits roles and adds a second branch membership", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL ||
      process.env.E2E_FIRST_LOGIN === "1" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321",
    "Requires the disposable local administrator after first login.",
  );
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.E2E_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("heading", { name: /Welcome,/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/jn-fin-dashboard.png", fullPage: true });
  const branch = "10000000-0000-4000-8000-000000000001";
  await page.goto(`/roles?branch=${branch}`);
  const createRole = page.locator("details").filter({
    has: page.getByText("Create custom branch role", { exact: true }),
  });
  await createRole.locator("summary").click();
  const roleName = `QA Reader ${Date.now()}`;
  await createRole.getByLabel("Role name", { exact: true }).fill(roleName);
  await createRole.getByLabel("View branch", { exact: true }).check();
  await createRole.getByRole("button", { name: "Save changes" }).click();
  await expect(createRole.getByRole("status")).toContainText("Changes saved");
  await expect(
    page.getByRole("heading", { name: roleName, exact: true }),
  ).toBeVisible();
  await page.goto("/users");
  await page
    .getByRole("row")
    .filter({ hasText: "Browser Test User" })
    .first()
    .getByRole("link", { name: "Manage" })
    .click();
  await expect(page).toHaveURL(/\/users\//);
  const targetPath = new URL(page.url()).pathname;
  await page.getByLabel("Selected branch").selectOption(branch);
  await expect(page).toHaveURL(new RegExp(`${targetPath}\\?branch=${branch}`));
  const membership = page.locator("section").filter({
    has: page.getByRole("heading", { name: /membership · Central Branch/ }),
  });
  await membership.getByLabel(roleName, { exact: true }).check();
  await membership.getByRole("button", { name: "Save changes" }).click();
  await expect(membership.getByRole("status")).toContainText("Changes saved");
  const summary = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Branch memberships",
      exact: true,
    }),
  });
  await expect(
    summary.getByText("Central Branch", { exact: true }),
  ).toBeVisible();
  await expect(summary.getByText(new RegExp(roleName))).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.screenshot({ path: "/tmp/jn-fin-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
