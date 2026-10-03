import { it, expect, vi } from "vitest";
import { provision } from "../src/lib/provisioning";
it("rolls back Auth when database provisioning fails", async () => {
  const remove = vi.fn().mockResolvedValue(undefined),
    record = vi.fn();
  await expect(
    provision({
      create: async () => "id",
      commit: async () => {
        throw new Error("database failure");
      },
      remove,
      record,
    }),
  ).rejects.toThrow("database failure");
  expect(remove).toHaveBeenCalledWith("id");
  expect(record).not.toHaveBeenCalled();
});
it("records failed rollback for recovery", async () => {
  const record = vi.fn().mockResolvedValue(undefined);
  await expect(
    provision({
      create: async () => "id",
      commit: async () => {
        throw new Error("db");
      },
      remove: async () => {
        throw new Error("auth");
      },
      record,
    }),
  ).rejects.toThrow("recovery required");
  expect(record).toHaveBeenCalledWith("id");
});
it("does not remove a successfully provisioned account", async () => {
  const remove = vi.fn();
  expect(
    await provision({
      create: async () => "id",
      commit: async () => ({ id: "id" }),
      remove,
      record: vi.fn(),
    }),
  ).toEqual({ id: "id" });
  expect(remove).not.toHaveBeenCalled();
});
