import { NextRequest, NextResponse } from "next/server";
import { resolveSandbox, createSandbox, HOME_DIR } from "@/lib/sandbox";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Ensures a sandbox exists for this browser session.
 * POST with `{ reset: true }` throws away the current sandbox and starts a
 * brand-new one. The sandbox id is returned + stored in an httpOnly cookie.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { reset?: boolean };
  const reset = !!body.reset;

  const existing = req.cookies.get(COOKIE_NAMES.sandbox)?.value;

  try {
    const { sandboxId } = reset
      ? { sandboxId: (await createSandbox()).sandboxId }
      : await resolveSandbox(existing);

    const res = NextResponse.json({ ok: true, status: "ready", sandboxId });
    res.cookies.set(COOKIE_NAMES.sandbox, sandboxId, cookieOpts());
    res.cookies.set(COOKIE_NAMES.cwd, DEFAULT_CWD, cookieOpts());
    res.cookies.set(COOKIE_NAMES.prev, "", cookieOpts());
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
