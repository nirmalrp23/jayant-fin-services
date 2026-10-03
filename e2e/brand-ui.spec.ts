import { test, expect } from "@playwright/test";

test("extension-added body attributes do not cause hydration warnings", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat|didn't match/i.test(m.text()))
      hydrationErrors.push(m.text());
  });
  page.on("pageerror", (e) => {
    if (/hydrat/i.test(e.message)) hydrationErrors.push(e.message);
  });
  await page.addInitScript(() => {
    const apply = () => {
      if (!document.body) return false;
      document.body.setAttribute("data-new-gr-c-s-check-loaded", "14.1334.0");
      document.body.setAttribute("data-gr-ext-installed", "");
      return true;
    };
    if (!apply()) {
      const observer = new MutationObserver(() => {
        if (apply()) observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  });
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Sign in securely" }),
  ).toBeEnabled();
  await expect(page.locator("body")).toHaveAttribute(
    "data-gr-ext-installed",
    "",
  );
  expect(hydrationErrors).toEqual([]);
});

test("branded sign-in stays usable at phone, tablet and desktop widths", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in securely" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `/tmp/jn-premium-login-${width}.png`,
        fullPage: true,
      });
  }
});

test("workspace layouts and mobile navigation adapt without page overflow", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL ||
      !process.env.E2E_ADMIN_PASSWORD ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321",
    "Requires local test account.",
  );
  const login = await page.request.post("/api/auth", {
    headers: { origin: "http://localhost:3000" },
    data: {
      action: "login",
      email: process.env.E2E_ADMIN_EMAIL,
      password: process.env.E2E_ADMIN_PASSWORD,
    },
  });
  expect(login.ok()).toBe(true);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/dashboard",
      "/branches",
      "/users",
      "/roles",
      "/profile",
      "/audit",
    ]) {
      await page.goto(path);
      await expect(page.locator("#main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
      if (path === "/dashboard" && (width === 390 || width === 1440))
        await page.screenshot({
          path: `/tmp/jn-premium-dashboard-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.locator(".mobile-navigation summary").click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "People" })
    .click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.locator("#main h1")).toHaveText("People");
  await expect(page.locator(".mobile-navigation")).not.toHaveAttribute(
    "open",
    "",
  );
});
