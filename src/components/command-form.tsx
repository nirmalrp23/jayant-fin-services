"use client";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import type { Operation } from "@/lib/validation";
export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "select" | "checkbox" | "checks";
  required?: boolean;
  value?: string | boolean | string[];
  options?: { value: string; label: string }[];
  hint?: string;
};
export function CommandForm({
  operation,
  hidden = {},
  fields,
  submit = "Save changes",
}: {
  operation: Operation;
  hidden?: Record<string, unknown>;
  fields: Field[];
  submit?: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [secret, setSecret] = useState("");
  return (
    <form
      method="post"
      action="/api/command"
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setSuccess("");
        setSecret("");
        const form = e.currentTarget;
        const f = new FormData(form);
        const payload: Record<string, unknown> = { ...hidden };
        for (const field of fields) {
          const value =
            field.type === "checkbox"
              ? f.has(field.name)
              : field.type === "checks"
                ? f.getAll(field.name)
                : f.get(field.name);
          if (value !== "" && value !== null) payload[field.name] = value;
        }
        try {
          const response = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operation, payload }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          if (data.temporaryPassword) {
            setSecret(data.temporaryPassword);
          }
          setSuccess("Changes saved.");
          router.refresh();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Unable to save changes",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((field) => (
        <div key={field.name} className="field">
          {field.type === "checkbox" ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name={field.name}
                defaultChecked={field.value === true}
              />
              {field.label}
            </label>
          ) : field.type === "checks" ? (
            <fieldset>
              <legend className="font-semibold mb-3">{field.label}</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {field.options?.map((o) => (
                  <label
                    key={o.value}
                    className="flex gap-2 items-center font-normal"
                  >
                    <input
                      type="checkbox"
                      name={field.name}
                      value={o.value}
                      defaultChecked={
                        Array.isArray(field.value) &&
                        field.value.includes(o.value)
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <>
              <label
                htmlFor={`${operation}-${field.name}-${String(hidden.id ?? "new")}`}
              >
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  id={`${operation}-${field.name}-${String(hidden.id ?? "new")}`}
                  name={field.name}
                  required={field.required}
                  defaultValue={String(field.value ?? "")}
                >
                  <option value="">Choose…</option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${operation}-${field.name}-${String(hidden.id ?? "new")}`}
                  type={field.type ?? "text"}
                  name={field.name}
                  required={field.required}
                  defaultValue={String(field.value ?? "")}
                  maxLength={field.type === "email" ? 254 : 120}
                />
              )}
            </>
          )}
          {field.hint && <p className="mt-2 text-xs muted">{field.hint}</p>}
        </div>
      ))}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-brand-700">
          {success}
        </p>
      )}
      {secret && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-bold">Temporary password — shown once</p>
          <p className="my-2 text-sm">
            Share privately with the account owner. It will disappear when you
            leave or dismiss this form.
          </p>
          <code className="block break-all select-all bg-white p-3">
            {secret}
          </code>
          <button
            type="button"
            className="mt-3 underline"
            onClick={() => setSecret("")}
          >
            I have shared it securely
          </button>
        </div>
      )}
      <Button disabled={busy || !hydrated}>{busy ? "Saving…" : submit}</Button>
    </form>
  );
}
