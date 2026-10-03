import { it, expect } from "vitest";
import { schemas, password } from "../src/lib/validation";
it("rejects invalid identifiers and unsupported authority", () => {
  expect(
    schemas["account.create"].safeParse({
      email: "x@y.com",
      full_name: "X",
      system_role: "owner",
    }).success,
  ).toBe(false);
  expect(schemas["membership.save"].safeParse({ id: "invalid" }).success).toBe(
    false,
  );
});
it("strips security flag injection from profile input", () => {
  expect(
    schemas["profile.save"].parse({
      full_name: "Staff",
      must_change_password: false,
      active: true,
    }),
  ).toEqual({ full_name: "Staff" });
});
it("enforces password strength", () => {
  expect(password.safeParse("123456789012").success).toBe(false);
  expect(password.safeParse("Strong-Local-Pass9").success).toBe(true);
});
