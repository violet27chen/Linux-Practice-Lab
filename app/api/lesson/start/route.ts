import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSandbox, runCapture, HOME_DIR } from "@/lib/sandbox";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";
import { getLesson } from "@/lib/lessons";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Runs a lesson's one-time `setup` commands inside the student's sandbox so
 * the working files exist before they start the task.
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
    if (lesson.setup) {
      const lines = lesson.setup
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        await runCapture(sandbox, line, cwd);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
