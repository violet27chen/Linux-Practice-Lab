import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { currentUser } from "@/lib/identity";
import { eq } from "drizzle-orm";
import { classes, classMembers } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Join a class by its share code (any logged-in user). */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const code = String(body.code ?? "").trim().toLowerCase();
  if (!code) return new NextResponse("Code required", { status: 400 });
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  if (!db) return NextResponse.json({ error: "db off" }, { status: 503 });

  const found = await db
    .select()
    .from(classes)
    .where(eq(classes.code, code))
    .limit(1);
  if (!found[0]) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  await db
    .insert(classMembers)
    .values({ classId: found[0].id, userId: me.id })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true, classId: found[0].id });
}
