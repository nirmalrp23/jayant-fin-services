import { describe, it, expect } from "vitest";
import {
  can,
  canDelegate,
  mayManageAccount,
  type Access,
  type Membership,
} from "../src/lib/access";
const membership = (
  user_id: string,
  branch_id: string,
  is_manager = false,
): Membership => ({
  id: user_id + branch_id,
  user_id,
  branch_id,
  is_manager,
  active: true,
});
const manager: Access = {
  id: "m",
  globalRole: null,
  memberships: [membership("m", "a", true), membership("m", "b")],
  permissions: {
    a: ["users.view", "users.edit", "users.create"],
    b: ["branches.view"],
  },
};
describe("Branch authority", () => {
  it("never combines permissions across branches", () => {
    expect(can(manager, "b", "users.edit")).toBe(false);
    expect(can(manager, "a", "users.edit")).toBe(true);
    expect(can(manager, undefined, "users.edit")).toBe(false);
  });
  it("cannot delegate unavailable permissions", () => {
    expect(canDelegate(manager, "a", ["users.create", "roles.manage"])).toBe(
      false,
    );
    expect(canDelegate(manager, "a", ["users.create"])).toBe(true);
  });
  it("prevents account-wide changes across scope", () => {
    expect(
      mayManageAccount(
        manager,
        "u",
        [],
        [membership("u", "a"), membership("u", "b")],
        "users.edit",
      ),
    ).toBe(false);
    expect(
      mayManageAccount(manager, "u", [], [membership("u", "a")], "users.edit"),
    ).toBe(true);
  });
  it("blocks manager self escalation and global targets", () => {
    expect(
      mayManageAccount(manager, "m", [], manager.memberships, "users.edit"),
    ).toBe(false);
    expect(
      mayManageAccount(
        manager,
        "u",
        [{ user_id: "u" }],
        [membership("u", "a")],
        "users.edit",
      ),
    ).toBe(false);
  });
  it("protects global accounts from Admin and allows Super Admin", () => {
    expect(
      mayManageAccount(
        { ...manager, globalRole: "admin" },
        "u",
        [{ user_id: "u" }],
        [],
        "users.edit",
      ),
    ).toBe(false);
    expect(
      mayManageAccount(
        { ...manager, globalRole: "super_admin" },
        "u",
        [{ user_id: "u" }],
        [],
        "users.edit",
      ),
    ).toBe(true);
  });
  it("does not treat a branch Manager as a global administrator", () => {
    expect(can(manager, "unknown", "users.view")).toBe(false);
  });
});
