"use client";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import Link from "next/link";
import { Button } from "./ui/button";
export function AuthForm({
  mode,
  configured = true,
}: {
  mode: "login" | "forgot" | "password";
  configured?: boolean;
}) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <form
      method="post"
      action="/api/auth"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const f = new FormData(e.currentTarget);
        if (mode === "password" && f.get("password") !== f.get("confirm")) {
          setError("Passwords do not match.");
          setBusy(false);
          return;
        }
        try {
          const response = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: mode,
              email: f.get("email"),
              password: f.get("password"),
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          if (data.redirect) window.location.assign(data.redirect);
          else setMessage(data.message);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Request failed");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-5"
    >
      {!configured && (
        <p className="error">
          Connect Supabase to enable sign-in. Setup instructions are in the
          project README.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-brand-50 p-4 text-brand-900">
          {message}
        </p>
      )}
      {mode !== "password" && (
        <div>
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="you@company.com"
          />
        </div>
      )}
      {mode !== "forgot" && (
        <div>
          <label htmlFor="password">
            {mode === "password" ? "New password" : "Password"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "password" ? "new-password" : "current-password"
            }
            minLength={mode === "password" ? 12 : 1}
            maxLength={128}
            required
          />
          {mode === "password" && (
            <p className="mt-2 text-xs muted">
              At least 12 characters, with uppercase, lowercase, a number and a
              symbol.
            </p>
          )}
        </div>
      )}
      {mode === "password" && (
        <div>
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      )}
      <Button className="w-full" disabled={busy || !configured || !hydrated}>
        {busy
          ? "Please wait…"
          : mode === "login"
            ? "Sign in securely"
            : mode === "forgot"
              ? "Send reset link"
              : "Update password"}
      </Button>
      {mode === "login" ? (
        <div className="text-center">
          <Link className="text-brand-700" href="/forgot-password">
            Forgot your password?
          </Link>
        </div>
      ) : mode === "forgot" ? (
        <Link className="block text-center text-brand-700" href="/login">
          Back to sign in
        </Link>
      ) : (
        <Logout />
      )}
    </form>
  );
}
export function Logout() {
  return (
    <button
      type="button"
      className="text-sm underline underline-offset-4"
      onClick={async () => {
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logout" }),
        });
        // A full navigation clears any previously authenticated client router state.
        window.location.replace(new URL("/login", window.location.origin).href);
      }}
    >
      Sign out
    </button>
  );
}
