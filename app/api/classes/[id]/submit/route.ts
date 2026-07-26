import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { currentUser, getDbSandbox, saveDbSandbox, getActiveClassForUser } from "@/lib/identity";
import { runCapture, isGoneError, createSandbox, remainingTimeoutMs, HOME_DIR } from "@/lib/sandbox";
import { eq, and } from "drizzle-orm";
import { classes, classMembers, classSubmissions, userSandbox } from "@/db/schema";

const PRACTICE = `${HOME_DIR}/practice`;

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Student submits the class task. We run the teacher's `answerCmd` inside the
 * student's own sandbox; exit code 0 means the task is solved and we record
 * `class_submissions.done = true`. No mock data — the result is whatever the
 * student's real filesystem state produces.
 */
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
  try {
    await ensureSchema();
  } catch {
    /* ignore */
  }
  if (!db) return NextResponse.json({ error: "db off" }, { status: 503 });

  const c = (
    await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
  )[0];
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isMember =
    c.teacherId === me.id ||
    (
      await db
        .select()
        .from(classMembers)
        .where(
          and(
            eq(classMembers.classId, classId),
            eq(classMembers.userId, me.id),
          ),
        )
        .limit(1)
    )[0] != null;
  if (!isMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (c.status !== "active") {
    return NextResponse.json(
      { ok: false, done: false, message: "课堂未开堂或已结束" },
      { status: 409 },
    );
  }
  if (!c.answerCmd.trim()) {
    return NextResponse.json(
      { ok: false, done: false, message: "教师尚未设置校验命令" },
      { status: 422 },
    );
  }

  // The student must have a running sandbox (they were using the terminal).
  let sbRow = await getDbSandbox(me.id);
  let sandboxId = sbRow?.sandboxId ?? null;
  let sandbox;
  try {
    if (!sandboxId) throw new Error("no sandbox");
    sandbox = await Sandbox.get({ sandboxId });
  } catch {
    // Sandbox gone or never started — recreate with the class's remaining time.
    const ac = await getActiveClassForUser(me.id);
    const fresh = await createSandbox(ac ? remainingTimeoutMs(ac.endsAt) : undefined);
    sandbox = fresh;
    sandboxId = fresh.sandboxId;
    await saveDbSandbox(me.id, sandboxId, PRACTICE);
  }

  let result: { exitCode: number; stdout: string; stderr: string };
  try {
    result = await runCapture(sandbox, c.answerCmd, PRACTICE);
  } catch (err) {
    if (isGoneError(err)) {
      const ac = await getActiveClassForUser(me.id);
      const fresh = await createSandbox(ac ? remainingTimeoutMs(ac.endsAt) : undefined);
      sandboxId = fresh.sandboxId;
      await saveDbSandbox(me.id, sandboxId, PRACTICE);
      result = await runCapture(fresh, c.answerCmd, PRACTICE);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, done: false, message }, { status: 500 });
    }
  }

  const passed = result.exitCode === 0;
  await db
    .insert(classSubmissions)
    .values({
      classId,
      userId: me.id,
      done: passed,
      verifiedAt: passed ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [classSubmissions.classId, classSubmissions.userId],
      set: { done: passed, verifiedAt: passed ? new Date() : null },
    });

  return NextResponse.json({
    ok: true,
    done: passed,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}
