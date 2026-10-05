import { expect, test } from "vitest";
import { closingDate } from "../src/lib/acknowledgement";
test("closing dates use calendar weeks and fortnightly dues", () => {
  expect(closingDate("2026-10-03", "Weekly", "10")).toBe("2026-12-12");
  expect(closingDate("2026-10-03", "Biweekly", "10")).toBe("2027-02-20");
  expect(closingDate("2028-02-22", "Weekly", "1")).toBe("2028-02-29");
  for (const dues of ["", "0", "-1", "1.5", "abc"])
    expect(closingDate("2026-10-03", "Weekly", dues)).toBe("");
  expect(closingDate("2026-02-30", "Weekly", "1")).toBe("");
});

test("loan-plan gold scheme extracts weight rather than scheme amount", async () => {
  const { goldGrams } = await import("../src/lib/acknowledgement");
  expect(goldGrams("1/2 GRAM ", true)).toBe("0.5");
  expect(goldGrams("1 GRAM HOLD", true)).toBe("1");
  expect(goldGrams("15000", true)).toBe("");
  expect(goldGrams("10", false)).toBe("10");
  expect(closingDate("2026-09-17", "Weekly", "50")).toBe("2027-09-02");
  expect(closingDate("2026-09-17", "Biweekly", "50")).toBe("2028-08-17");
});
