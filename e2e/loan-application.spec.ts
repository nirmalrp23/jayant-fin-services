import { test, expect } from "@playwright/test";

test("HTML loan form supports editing, clearing and two-page printing", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL ||
      !process.env.E2E_ADMIN_PASSWORD ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321",
    "Local fixture required",
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
  await page.goto("/loan-application");
  await expect(page.locator(".loan-form-sheet")).toHaveCount(2);
  await expect(page.locator('img[src*="loan-application-"]')).toHaveCount(0);
  await page
    .getByLabel("உறுப்பினர் பெயர்", { exact: true })
    .fill("சோதனை உறுப்பினர்");
  await page.getByRole("radio", { name: "கிராமம்", exact: true }).check();
  await page.getByRole("radio", { name: "நகரம்", exact: true }).check();
  await expect(
    page.getByRole("radio", { name: "கிராமம்", exact: true }),
  ).not.toBeChecked();
  await page
    .getByLabel("Upload applicant photo")
    .setInputFiles("public/branding/jayant-logo.jpg");
  await expect(
    page.getByRole("img", { name: "Applicant photo" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/jfs-loan-html.png", fullPage: true });
  const pdf = await page.pdf({
    path: "/tmp/jfs-loan-html.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  const pdfText = pdf.toString("latin1");
  expect(pdfText.match(/\/Type \/Page\b/g)).toHaveLength(2);
  const boxes = [
    ...pdfText.matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g),
  ];
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(Number(box[1])).toBeCloseTo(612, 0);
    expect(Number(box[2])).toBeCloseTo(1008, 0);
  }
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Clear entries" }).click();
  await expect(
    page.getByLabel("உறுப்பினர் பெயர்", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("radio", { name: "நகரம்", exact: true }),
  ).not.toBeChecked();
  await expect(page.getByRole("img", { name: "Applicant photo" })).toHaveCount(
    0,
  );
});
