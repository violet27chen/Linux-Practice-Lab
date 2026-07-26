import { NextRequest, NextResponse } from "next/server";
import {
  resolveSandbox,
  HOME_DIR,
  sandboxTimeoutMs,
  remainingTimeoutMs,
} from "@/lib/sandbox";
import { ensureSchema } from "@/db/ensure";
import {
  resolveUserId,
  getDbSandbox,
  saveDbSandbox,
  getActiveClassForUser,
} from "@/lib/identity";
import { db } from "@/db";
import { classes as classesT, classSubmissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Ensures a sandbox exists for this request.
 * - Auth disabled (zero-config mode): anonymous cookie sandbox, default timeout.
 * - Auth enabled: the caller MUST be logged in AND a member of an active class.
 *   The sandbox lifetime is tied to the remaining class time. Returns
 *   `needLogin` / `needClass` otherwise so the client can show the right gate.
 * POST with `{ reset: true }` throws away the current sandbox and starts fresh.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { reset?: boolean };
  const reset = !!body.reset;

  try {
    await ensureSchema();
  } catch {
    /* db not configured */
  }

  const userId = await resolveUserId();
  if (AUTH_ENABLED && !userId) {
    return NextResponse.json({ ok: false, needLogin: true }, { status: 401 });
  }

  let timeoutMs = sandboxTimeoutMs();
  let classInfo: {
    id: number;
    name: string;
    task: string;
    answerCmd: string;
    endsAt: number | null;
    status: string;
    done: boolean;
  } | null = null;

  if (AUTH_ENABLED) {
    const ac = await getActiveClassForUser(userId!);
    if (!ac) {
      return NextResponse.json({ ok: false, needClass: true }, { status: 403 });
    }
    timeoutMs = remainingTimeoutMs(ac.endsAt);
    if (db) {
      const c = (
        await db
          .select()
          .from(classesT)
          .where(eq(classesT.id, ac.classId))
          .limit(1)
      )[0];
      if (c) {
        let done = false;
        const sub = await db
          .select({ done: classSubmissions.done })
          .from(classSubmissions)
          .where(
            and(
              eq(classSubmissions.classId, c.id),
              eq(classSubmissions.userId, userId!),
            ),
          )
          .limit(1);
        done = sub[0]?.done ?? false;
        classInfo = {
          id: c.id,
          name: c.name,
          task: c.task,
          answerCmd: c.answerCmd,
          endsAt: c.endsAt ? c.endsAt.getTime() : null,
          status: c.status,
          done,
        };
      }
    }
  }

  const cookieId = req.cookies.get(COOKIE_NAMES.sandbox)?.value ?? null;
  const dbSb = userId ? await getDbSandbox(userId) : null;
  const effectiveId = reset ? null : (dbSb?.sandboxId ?? cookieId ?? null);

  let sandboxId: string;
  try {
    const resolved = await resolveSandbox(effectiveId, timeoutMs);
    sandboxId = resolved.sandboxId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (userId) await saveDbSandbox(userId, sandboxId, DEFAULT_CWD);

  const res = NextResponse.json({
    ok: true,
    status: "ready",
    sandboxId,
    loggedIn: !!userId,
    class: classInfo,
  });
  res.cookies.set(COOKIE_NAMES.sandbox, sandboxId, cookieOpts());
  res.cookies.set(COOKIE_NAMES.cwd, DEFAULT_CWD, cookieOpts());
  res.cookies.set(COOKIE_NAMES.prev, "", cookieOpts());
  return res;
}
