import { NextRequest, NextResponse } from "next/server";
import {
  resolveSandbox,
  resolveCd,
  execInSandbox,
  createSandbox,
  isGoneError,
  sandboxTimeoutMs,
  remainingTimeoutMs,
  HOME_DIR,
  createStreamWritable,
} from "@/lib/sandbox";
import { ensureSchema } from "@/db/ensure";
import {
  resolveUserId,
  getDbSandbox,
  saveDbSandbox,
  getActiveClassForUser,
} from "@/lib/identity";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Streams a student command through the session's Linux sandbox.
 * - Auth disabled: anonymous cookie sandbox (zero-config mode).
 * - Auth enabled: caller must be logged in AND in an active class; the sandbox
 *   lifetime equals the remaining class time. Otherwise returns `needLogin` /
 *   `needClass` and allocates nothing.
 */
export async function POST(req: NextRequest) {
  let body: { command?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const command = (body.command ?? "").replace(/\r\n/g, "\n");
  const cookieSandboxId = req.cookies.get(COOKIE_NAMES.sandbox)?.value ?? null;
  const cookieCwd = req.cookies.get(COOKIE_NAMES.cwd)?.value || DEFAULT_CWD;
  const prev = req.cookies.get(COOKIE_NAMES.prev)?.value || "";

  try {
    await ensureSchema();
  } catch {
    /* db not configured -> anonymous mode */
  }

  const userId = await resolveUserId();
  if (AUTH_ENABLED && !userId) {
    return new NextResponse("\r\n[error] 请先登录 GitHub 后再使用终端。\r\n", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let timeoutMs = sandboxTimeoutMs();
  if (AUTH_ENABLED) {
    const ac = await getActiveClassForUser(userId!);
    if (!ac) {
      return new NextResponse(
        "\r\n[error] 请先加入一个由教师开堂的活跃课堂，再使用终端。\r\n",
        {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
    timeoutMs = remainingTimeoutMs(ac.endsAt);
  }

  const dbSb = userId ? await getDbSandbox(userId) : null;
  const effectiveId = dbSb?.sandboxId ?? cookieSandboxId ?? null;
  const cwd = cookieCwd;

  if (command.trim() === "") {
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(COOKIE_NAMES.cwd, cwd, cookieOpts());
    return res;
  }

  const cd = resolveCd(command, cwd, prev || null, HOME_DIR);
  if (cd) {
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(COOKIE_NAMES.cwd, cd.cwd, cookieOpts());
    res.cookies.set(COOKIE_NAMES.prev, cd.prev, cookieOpts());
    return res;
  }

  let sandbox;
  let sandboxId: string;
  let reused = false;
  try {
    const resolved = await resolveSandbox(effectiveId, timeoutMs);
    sandbox = resolved.sandbox;
    sandboxId = resolved.sandboxId;
    reused = !resolved.created;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`\r\n[error] ${message}\r\n`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stdout = createStreamWritable(controller);
        const stderr = createStreamWritable(controller);
        try {
          const exitCode = await execInSandbox(
            sandbox,
            command,
            cwd,
            stdout,
            stderr,
          );
          controller.enqueue(encoder.encode(`\u0000LP:EXIT=${exitCode}\u0000`));
        } catch (err) {
          // A reused sandbox can expire between requests (HTTP 410). Recreate a
          // fresh one (with the class timeout) and retry exactly once.
          if (isGoneError(err) && reused) {
            const fresh = await createSandbox(timeoutMs);
            sandboxId = fresh.sandboxId;
            if (userId) await saveDbSandbox(userId, sandboxId, cwd);
            await execInSandbox(fresh, command, cwd, stdout, stderr);
            controller.enqueue(encoder.encode(`\u0000LP:EXIT=0\u0000`));
          } else {
            throw err;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\r\n[error] ${message}\r\n`));
      } finally {
        controller.close();
      }
    },
  });

  const res = new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
  res.cookies.set(COOKIE_NAMES.sandbox, sandboxId, cookieOpts());
  res.cookies.set(COOKIE_NAMES.cwd, cwd, cookieOpts());
  return res;
}
