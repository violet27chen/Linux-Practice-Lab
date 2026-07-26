import { NextRequest, NextResponse } from "next/server";
import { resolveSandbox, runCapture, HOME_DIR } from "@/lib/sandbox";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";
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

  const cookieSandboxId = req.cookies.get(COOKIE_NAMES.sandbox)?.value ?? null;
  const cwd = req.cookies.get(COOKIE_NAMES.cwd)?.value || DEFAULT_CWD;

  try {
    const { sandbox, sandboxId } = await resolveSandbox(cookieSandboxId);
    const result = await runCapture(sandbox, lesson.verify, cwd);
    const passed = result.exitCode === 0;
    const res = NextResponse.json({
      ok: true,
      passed,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    res.cookies.set(COOKIE_NAMES.sandbox, sandboxId, cookieOpts());
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
