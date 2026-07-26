import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { currentUser } from "@/lib/identity";
import { eq, and, inArray } from "drizzle-orm";
import {
  classes,
  classMembers,
  classAssignments,
  users,
  userProgress,
} from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

async function canAccess(classId: number, userId: number): Promise<{
  ok: boolean;
  teacher: boolean;
} | null> {
  if (!db) return null;
  const c = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  if (!c[0]) return null;
  if (c[0].teacherId === userId) return { ok: true, teacher: true };
  const m = await db
    .select()
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, userId),
      ),
    )
    .limit(1);
  return m[0] ? { ok: true, teacher: false } : { ok: false, teacher: false };
}

/** GET: class detail with members + per-assignment completion. POST: assign lessons (teacher). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const classId = Number(idStr);
  if (!Number.isInteger(classId)) {
    return new NextResponse("Bad request", { status: 400 });
  }
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  if (!db) return NextResponse.json({ error: "db off" }, { status: 503 });

  const access = await canAccess(classId, me.id);
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!access.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const c = (
    await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
  )[0];
  const assignments = await db
    .select({ lessonId: classAssignments.lessonId })
    .from(classAssignments)
    .where(eq(classAssignments.classId, classId));
  const lessonIds = assignments.map((a) => a.lessonId);

  const members = await db
    .select({
      userId: classMembers.userId,
      name: users.name,
      image: users.image,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(eq(classMembers.classId, classId));

  const memberIds = members.map((m) => m.userId);
  const doneRows =
    memberIds.length > 0
      ? await db
          .select({ userId: userProgress.userId, lessonId: userProgress.lessonId })
          .from(userProgress)
          .where(
            and(
              inArray(userProgress.userId, memberIds),
              eq(userProgress.done, true),
            ),
          )
      : [];
  const doneByUser = new Map<number, Set<string>>();
  for (const d of doneRows) {
    if (!doneByUser.has(d.userId)) doneByUser.set(d.userId, new Set());
    doneByUser.get(d.userId)!.add(d.lessonId);
  }

  const people = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    image: m.image,
    done: lessonIds.filter((lid) => doneByUser.get(m.userId)?.has(lid)),
  }));

  return NextResponse.json({
    id: c.id,
    name: c.name,
    code: c.code,
    isTeacher: access.teacher,
    assignments: lessonIds,
    members: people,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await params;
  const classId = Number(idStr);
  if (!Number.isInteger(classId)) {
    return new NextResponse("Bad request", { status: 400 });
  }
  const access = await canAccess(classId, me.id);
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!access.teacher) {
    return NextResponse.json({ error: "teacher only" }, { status: 403 });
  }

  let body: { lessonId?: string; lessonIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const toAdd = Array.isArray(body.lessonIds)
    ? body.lessonIds.map(String)
    : body.lessonId
      ? [String(body.lessonId)]
      : [];
  if (toAdd.length === 0) {
    return new NextResponse("lessonId required", { status: 400 });
  }
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  if (!db) return NextResponse.json({ error: "db off" }, { status: 503 });

  await db
    .insert(classAssignments)
    .values(toAdd.map((lessonId) => ({ classId, lessonId })))
    .onConflictDoNothing();

  const assignments = await db
    .select({ lessonId: classAssignments.lessonId })
    .from(classAssignments)
    .where(eq(classAssignments.classId, classId));
  return NextResponse.json({
    ok: true,
    assignments: assignments.map((a) => a.lessonId),
  });
}
