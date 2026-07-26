import { NextRequest, NextResponse } from "next/server";
import { resolveSandbox, HOME_DIR } from "@/lib/sandbox";
import { ensureSchema } from "@/db/ensure";
import { resolveUserId, getDbSandbox, saveDbSandbox } from "@/lib/identity";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Ensures a sandbox exists for this request.
 * - Logged-in users: the authoritative sandbox id is stored in the DB and
 *   survives cookie clears / device switches. Falls back to the cookie for the
 *   working directory within a session.
 * - Anonymous users: everything lives in the httpOnly cookie (original design).
 * POST with `{ reset: true }` throws away the current sandbox and starts fresh.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { reset?: boolean };
  const reset = !!body.reset;

  try {
    await ensureSchema();
  } catch {
    /* db not configured -> anonymous mode */
  }

  const userId = await resolveUserId();
  const dbSb = userId ? await getDbSandbox(userId) : null;

  const cookieId = req.cookies.get(COOKIE_NAMES.sandbox)?.value ?? null;
  const effectiveId = reset ? null : (dbSb?.sandboxId ?? cookieId ?? null);

  let sandboxId: string;
  try {
    const resolved = await resolveSandbox(effectiveId);
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
  });
  res.cookies.set(COOKIE_NAMES.sandbox, sandboxId, cookieOpts());
  res.cookies.set(COOKIE_NAMES.cwd, DEFAULT_CWD, cookieOpts());
  res.cookies.set(COOKIE_NAMES.prev, "", cookieOpts());
  return res;
}
