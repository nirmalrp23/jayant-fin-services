import { z } from "zod";
const id = z.uuid();
const branch = id.optional();
const name = z.string().trim().min(1).max(120);
export const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^a-zA-Z0-9]/, "Include a symbol");
export const schemas = {
  "branch.save": z.object({
    id: id.optional(),
    name,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{2,20}$/),
    active: z.boolean().optional(),
  }),
  "account.create": z.object({
    full_name: name,
    email: z.email().toLowerCase(),
    branch_id: branch,
    role_id: id.optional(),
    system_role: z.enum(["none", "admin", "super_admin"]).default("none"),
    is_manager: z.boolean().default(false),
  }),
  "account.save": z.object({
    id,
    full_name: name,
    active: z.boolean().optional(),
  }),
  "system.assign": z.object({
    id,
    system_role: z.enum(["none", "admin", "super_admin"]),
  }),
  "membership.save": z.object({
    id,
    branch_id: id,
    role_ids: z.array(id).min(1).max(20),
    is_manager: z.boolean().default(false),
    active: z.boolean().default(true),
  }),
  "role.save": z.object({
    id: id.optional(),
    branch_id: id,
    name: name.max(80),
    permissions: z.array(z.string().max(80)).max(30),
    active: z.boolean().optional(),
  }),
  "profile.save": z.object({ full_name: name }),
  "account.reset": z.object({ id }),
};
export type Operation = keyof typeof schemas;
