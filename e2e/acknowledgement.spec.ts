import { test, expect } from "@playwright/test";

test("acknowledgement edits, photos, preview and A5 PDF", async ({ page }) => {
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
  await page.goto("/acknowledgements");
  await page
    .getByRole("textbox", { name: "Acknowledgement number", exact: true })
    .fill("1201");
  await page.getByLabel("Creation Date", { exact: true }).fill("2026-10-03");
  for (const [label, value] of Object.entries({
    "Branch Name": "Karur",
    "Center Name": "Central",
    "Member Name": "Sample Member",
    "Gold Grams": "10 g",
    "Booking Amount": "₹ 5,000",
  }))
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  await page.getByLabel("No. of Dues", { exact: true }).fill("10");
  await expect(page.getByLabel("Closing Date", { exact: true })).toHaveText(
    "12.12.2026",
  );
  await page.getByRole("radio", { name: "Biweekly", exact: true }).check();
  await expect(page.getByLabel("Closing Date", { exact: true })).toHaveText(
    "20.02.2027",
  );
  await page.getByLabel("Upload member photo").setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("status")).toContainText("Choose a JPG");
  await page
    .getByLabel("Upload member photo")
    .setInputFiles("public/branding/jayant-logo.jpg");
  await expect(
    page.getByRole("img", { name: "Member photo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".ack-slip input")).toHaveCount(0);
  await expect(page.locator(".ack-slip")).toContainText("Sample Member");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/jfs-ack-desktop.png", fullPage: true });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/jfs-ack-mobile.png", fullPage: true });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const pdf = await downloaded;
  await pdf.saveAs("/tmp/jfs-acknowledgement.pdf");
  expect(pdf.suggestedFilename()).toContain("1201-Sample-Member");
  await expect(page.getByRole("status")).toContainText("PDF downloaded");
  await page.getByRole("button", { name: "Edit slip" }).click();
  await expect(
    page.getByRole("textbox", { name: "Member Name", exact: true }),
  ).toHaveValue("Sample Member");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.pdf({
    path: "/tmp/jfs-ack-print.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  const editDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await (await editDownload).saveAs("/tmp/jfs-ack-edit.pdf");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Member photo", exact: true }),
  ).toHaveCount(0);
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Members");
  ws.addRow([
    "Branch Name",
    "Center Name",
    "Member Name",
    "Gold Grams",
    "Booking Amount",
    "No. of Dues",
    "Creation Date",
    "Type",
  ]);
  ws.addRow([
    "Karur",
    "Uppidamangalam",
    "Nirmal",
    100,
    10000,
    10,
    "03-10-2026",
    "Weekly",
  ]);
  ws.addRow([
    "Karur",
    "Central",
    "Second Member",
    5,
    2000,
    20,
    "2026-11-01",
    "Biweekly",
  ]);
  ws.mergeCells("A6:H6"); // Blank merged footer cells must not break import.
  ws.getCell("I6").value = "Footer";
  await page.getByLabel("Upload Excel").setInputFiles({
    name: "members.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  await expect(page.locator(".ack-sheet-status")).toContainText(
    "2 members loaded",
  );
  await expect(page.getByLabel("Member Name", { exact: true })).toHaveValue(
    "Nirmal",
  );
  await expect(page.getByLabel("Closing Date", { exact: true })).toHaveText(
    "12.12.2026",
  );
  await page.getByRole("button", { name: "Next member" }).click();
  await expect(page.getByLabel("Member Name", { exact: true })).toHaveValue(
    "Second Member",
  );
  await expect(page.getByLabel("Acknowledgement number")).toHaveValue("1202");
  await expect(page.getByLabel("Creation Date", { exact: true })).toHaveValue(
    "2026-11-01",
  );
  await expect(
    page.getByRole("radio", { name: "Biweekly", exact: true }),
  ).toBeChecked();
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole("button", { name: "Print all", exact: true }).click();
  await expect(page.locator(".ack-batch .ack-slip")).toHaveCount(2);
  await page.pdf({
    path: "/tmp/jfs-ack-batch.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.getByLabel("Member Name", { exact: true })).toHaveValue(
    "Second Member",
  );
  if (process.env.E2E_LOAN_PLAN) {
    await page.getByRole("radio", { name: "Weekly", exact: true }).check();
    await page
      .getByLabel("Upload Excel")
      .setInputFiles(process.env.E2E_LOAN_PLAN);
    await expect(page.locator(".ack-sheet-status")).toContainText(
      "53 members loaded",
    );
    await expect(page.locator(".ack-sheet-status")).toContainText(
      "1 member(s) need Gold Grams",
    );
    await expect(page.getByLabel("Branch Name", { exact: true })).toHaveValue(
      "GOBI",
    );
    await expect(page.getByLabel("Gold Grams", { exact: true })).toHaveValue(
      "0.5",
    );
    await expect(
      page.getByLabel("Booking Amount", { exact: true }),
    ).toHaveValue("4000");
    await expect(page.getByLabel("Creation Date", { exact: true })).toHaveValue(
      "2026-09-17",
    );
    await expect(page.getByLabel("No. of Dues", { exact: true })).toHaveValue(
      "50",
    );
    await expect(page.getByLabel("Closing Date", { exact: true })).toHaveText(
      "02.09.2027",
    );
    await page.getByRole("radio", { name: "Biweekly", exact: true }).check();
    await expect(page.getByLabel("Closing Date", { exact: true })).toHaveText(
      "17.08.2028",
    );
    await page.getByRole("button", { name: "Next member" }).click();
    await page.getByRole("button", { name: "Previous member" }).click();
    await expect(
      page.getByRole("radio", { name: "Biweekly", exact: true }),
    ).toBeChecked();
  }
});
