import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    const db = await sessionClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL("/change-password", process.env.APP_ORIGIN),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=recovery", process.env.APP_ORIGIN),
  );
}
