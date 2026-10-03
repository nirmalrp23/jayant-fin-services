import "server-only";
import { randomBytes, createHmac } from "node:crypto";
import { adminClient, sessionClient } from "./supabase/server";
import { schemas, type Operation } from "./validation";
import { provision } from "./provisioning";
export async function rateLimit(subject: string, limit = 12, seconds = 900) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Server configuration incomplete");
  const k = createHmac("sha256", secret).update(subject).digest("hex");
  const { data, error } = await adminClient().rpc("consume_rate_limit", {
    k,
    max_hits: limit,
    window_seconds: seconds,
  });
  if (error || !data) throw new Error("Please wait before trying again.");
}
export async function actor(allowPassword = false) {
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Access denied");
  const { data: p } = await db
    .from("profiles")
    .select("active,must_change_password")
    .eq("id", user.id)
    .single();
  if (!p?.active || (!allowPassword && p.must_change_password))
    throw new Error("Access denied");
  return user;
}
export async function command(operation: Operation, raw: unknown) {
  const user = await actor();
  const payload = schemas[operation].parse(raw);
  await rateLimit(`admin:${user.id}`, 60, 300);
  const db = adminClient();
  if (operation === "account.reset") {
    const target = (payload as { id: string }).id;
    const temporaryPassword = `Jn!${randomBytes(24).toString("base64url")}7aA`;
    await changePassword(user.id, target, temporaryPassword, true);
    return { temporaryPassword };
  }
  if (operation === "account.create") {
    const p = schemas["account.create"].parse(payload);
    const check = await db.rpc("app_command", {
      actor: user.id,
      operation: "account.validate",
      payload: p,
    });
    if (check.error) throw new Error("Access denied or invalid assignment");
    const temporaryPassword = `Jn!${randomBytes(24).toString("base64url")}7aA`;
    return provision({
      create: async () => {
        const { data, error } = await db.auth.admin.createUser({
          email: p.email,
          password: temporaryPassword,
          email_confirm: true,
        });
        if (error || !data.user)
          throw new Error(
            "Unable to create account. Check the details or contact an administrator.",
          );
        return data.user.id;
      },
      commit: async (id) => {
        const result = await db.rpc("app_command", {
          actor: user.id,
          operation: "account.create",
          payload: { ...p, id },
        });
        if (result.error) throw new Error("Account provisioning failed");
        return { id, temporaryPassword };
      },
      remove: async (id) => {
        const { error } = await db.auth.admin.deleteUser(id);
        if (error) throw error;
      },
      record: async (id) => {
        await db.auth.admin.updateUserById(id, { ban_duration: "876000h" });
        const { error } = await db.rpc("record_provisioning_failure", {
          target: id,
        });
        if (error)
          throw new Error(`Provisioning recovery required for account ${id}`);
      },
    });
  }
  const { data, error } = await db.rpc("app_command", {
    actor: user.id,
    operation,
    payload,
  });
  if (error)
    throw new Error(
      error.message.includes("Super Admin")
        ? "At least one active Super Admin is required."
        : "Change denied. Check your authority and the submitted values.",
    );
  return data;
}
export async function changePassword(
  actorId: string,
  target: string,
  password: string,
  administrative = false,
) {
  const db = adminClient();
  const { data: token, error } = await db.rpc("password_begin", {
    actor: actorId,
    target,
    administrative,
  });
  if (error || !token)
    throw new Error(
      "Password change denied or already in progress. Contact your administrator if this persists.",
    );
  const update = administrative
    ? await db.auth.admin.updateUserById(target, { password })
    : await (await sessionClient()).auth.updateUser({ password });
  if (update.error) {
    // A confirmed Auth rejection can release the reservation; an ambiguous transport failure must not.
    if (
      update.error.status &&
      update.error.status >= 400 &&
      update.error.status < 500
    )
      await db.rpc("password_abort", { target, token });
    throw new Error(
      "Password was not changed. Use a different strong password and a recent login. Contact your administrator if this persists.",
    );
  }
  const finish = await db.rpc("password_finish", {
    actor: actorId,
    target,
    token,
    administrative,
  });
  if (finish.error)
    throw new Error(
      "Password updated but access is still restricted. Contact your administrator to recover the interrupted operation.",
    );
}
