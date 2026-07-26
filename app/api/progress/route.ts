import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { resolveUserId } from "@/lib/identity";
import { eq } from "drizzle-orm";
import { userProgress } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET: completed lesson ids for the logged-in user. Anonymous / db-off requests
 * return `{ anonymous: true }` so the client can fall back to localStorage.
 * POST: mark a lesson done/undone.
 */
export async function GET() {
  const userId = await resolveUserId();
  if (!userId || !db) {
    return NextResponse.json({ ok: true, anonymous: true, done: [] });
  }
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  const rows = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId));
  return NextResponse.json({
    ok: true,
    anonymous: false,
    done: rows.filter((r) => r.done).map((r) => r.lessonId),
  });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId();
  if (!userId || !db) {
    return NextResponse.json({ ok: false, anonymous: true }, { status: 401 });
  }
  let body: { lessonId?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const lessonId = String(body.lessonId ?? "");
  const done = !!body.done;
  if (!lessonId) return new NextResponse("Bad request", { status: 400 });
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  await db
    .insert(userProgress)
    .values({ userId, lessonId, done })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.lessonId],
      set: { done, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
}
