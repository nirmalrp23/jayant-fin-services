import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionClient, configured } from "@/lib/supabase/server";
import { actor, changePassword, rateLimit } from "@/lib/service";
import { password } from "@/lib/validation";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== process.env.APP_ORIGIN)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    if (!configured())
      throw new Error("Supabase setup is required. Follow the project README.");
    const body = await request.json();
    const db = await sessionClient();
    if (body.action === "logout") {
      await db.auth.signOut();
      return NextResponse.json({ redirect: "/login" });
    }
    if (body.action === "password") {
      const user = await actor(true);
      const value = password.parse(body.password);
      await rateLimit(`password:${user.id}`, 6, 900);
      await changePassword(user.id, user.id, value);
      await db.auth.signOut({ scope: "global" });
      return NextResponse.json({ redirect: "/login?changed=1" });
    }
    const email = z.email().max(254).parse(body.email).toLowerCase();
    // Account and application-wide buckets are durable. No trust in spoofable IP headers.
    await rateLimit("auth:global", 500, 900);
    await rateLimit(`auth:${email}`, 8, 900);
    if (body.action === "login") {
      const value = z.string().min(1).max(128).parse(body.password);
      const { error } = await db.auth.signInWithPassword({
        email,
        password: value,
      });
      if (error) throw new Error("Unable to sign in with those details.");
      const {
        data: { user },
      } = await db.auth.getUser();
      const { data: p } = await db
        .from("profiles")
        .select("active,must_change_password")
        .eq("id", user!.id)
        .single();
      if (!p?.active) {
        await db.auth.signOut();
        throw new Error("Unable to sign in with those details.");
      }
      return NextResponse.json({
        redirect: p.must_change_password ? "/change-password" : "/dashboard",
      });
    }
    if (body.action === "forgot") {
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_ORIGIN}/auth/callback`,
      });
      return NextResponse.json({
        message:
          "If an eligible account exists, a password reset link will be sent.",
      });
    }
    throw new Error("Invalid request");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0].message
            : error instanceof Error
              ? error.message
              : "Unable to complete request",
      },
      { status: 400 },
    );
  }
}
