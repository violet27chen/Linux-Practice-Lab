import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSandbox, runCapture, HOME_DIR } from "@/lib/sandbox";
import { COOKIE_NAMES } from "@/lib/cookies";
import { getLesson } from "@/lib/lessons";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Runs a lesson's `verify` command in the student's sandbox. The task is
 * solved when the command exits with code 0.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { lessonId?: string };
  const lesson = body.lessonId ? getLesson(body.lessonId) : undefined;
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "Unknown lesson" }, { status: 400 });
  }

  const name = req.cookies.get(COOKIE_NAMES.sandbox)?.value;
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "No active session" },
      { status: 400 },
    );
  }

  const cwd = req.cookies.get(COOKIE_NAMES.cwd)?.value || DEFAULT_CWD;

  try {
    const sandbox = await getOrCreateSandbox(name);
    const result = await runCapture(sandbox, lesson.verify, cwd);
    const passed = result.exitCode === 0;
    return NextResponse.json({
      ok: true,
      passed,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
