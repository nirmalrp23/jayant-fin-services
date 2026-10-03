import { NextResponse } from "next/server";
import { command } from "@/lib/service";
import { schemas, type Operation } from "@/lib/validation";
import { z } from "zod";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== process.env.APP_ORIGIN)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const body = await request.json();
    if (
      typeof body.operation !== "string" ||
      !Object.hasOwn(schemas, body.operation)
    )
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    const data = await command(body.operation as Operation, body.payload);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0].message
            : error instanceof Error
              ? error.message
              : "Unable to save changes",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
