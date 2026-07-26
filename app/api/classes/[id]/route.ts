import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { currentUser } from "@/lib/identity";
import { destroySandbox } from "@/lib/sandbox";
import { eq, and, inArray } from "drizzle-orm";
import {
  classes,
  classMembers,
  classSubmissions,
  users,
  userSandbox,
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

/** GET: class detail with members + per-student task completion.
 *  POST: teacher actions — open (开堂) / close (下课) / setTask / setDuration. */
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
  const subs =
    memberIds.length > 0
      ? await db
          .select({ userId: classSubmissions.userId, done: classSubmissions.done })
          .from(classSubmissions)
          .where(
            and(
              eq(classSubmissions.classId, classId),
              inArray(classSubmissions.userId, memberIds),
            ),
          )
      : [];
  const doneByUser = new Map<number, boolean>();
  for (const s of subs) doneByUser.set(s.userId, s.done);

  const people = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    image: m.image,
    done: doneByUser.get(m.userId) ?? false,
  }));

  return NextResponse.json({
    id: c.id,
    name: c.name,
    code: c.code,
    isTeacher: access.teacher,
    status: c.status,
    task: c.task,
    // The verify command is the teacher's grading key — never expose it to students.
    answerCmd: access.teacher ? c.answerCmd : "",
    durationMin: c.durationMin,
    startedAt: c.startedAt ? c.startedAt.getTime() : null,
    endsAt: c.endsAt ? c.endsAt.getTime() : null,
    myDone: doneByUser.get(me.id) ?? false,
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

  let body: {
    action?: string;
    task?: string;
    answerCmd?: string;
    durationMin?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  if (!db) return NextResponse.json({ error: "db off" }, { status: 503 });

  const action = String(body.action ?? "");

  if (action === "open") {
    const durationMin =
      Number.isFinite(Number(body.durationMin)) &&
      Number(body.durationMin) >= 1 &&
      Number(body.durationMin) <= 1440
        ? Math.round(Number(body.durationMin))
        : 90;
    const task = String(body.task ?? "").slice(0, 20000);
    const answerCmd = String(body.answerCmd ?? "").slice(0, 20000);
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationMin * 60_000);
    await db
      .update(classes)
      .set({
        status: "active",
        startedAt: now,
        endsAt,
        durationMin,
        task,
        answerCmd,
      })
      .where(eq(classes.id, classId));
    return NextResponse.json({ ok: true, status: "active", endsAt: endsAt.getTime() });
  }

  if (action === "close") {
    const now = new Date();
    await db
      .update(classes)
      .set({ status: "ended", endsAt: now })
      .where(eq(classes.id, classId));
    // Synchronously reclaim every member's sandbox.
    const memberRows = await db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(eq(classMembers.classId, classId));
    const ids = memberRows.map((r) => r.userId);
    if (ids.length > 0) {
      const sbRows = await db
        .select({ sandboxId: userSandbox.sandboxId })
        .from(userSandbox)
        .where(inArray(userSandbox.userId, ids));
      await Promise.all(
        sbRows.map((r) => destroySandbox(r.sandboxId)),
      );
      await db
        .delete(userSandbox)
        .where(inArray(userSandbox.userId, ids));
    }
    return NextResponse.json({ ok: true, status: "ended" });
  }

  if (action === "setTask") {
    const task = String(body.task ?? "").slice(0, 20000);
    const answerCmd = String(body.answerCmd ?? "").slice(0, 20000);
    await db
      .update(classes)
      .set({ task, answerCmd })
      .where(eq(classes.id, classId));
    return NextResponse.json({ ok: true, task, answerCmd });
  }

  if (action === "setDuration") {
    const durationMin =
      Number.isFinite(Number(body.durationMin)) &&
      Number(body.durationMin) >= 1 &&
      Number(body.durationMin) <= 1440
        ? Math.round(Number(body.durationMin))
        : 90;
    await db
      .update(classes)
      .set({ durationMin })
      .where(eq(classes.id, classId));
    return NextResponse.json({ ok: true, durationMin });
  }

  return new NextResponse("unknown action", { status: 400 });
}
