import { NextRequest, NextResponse } from "next/server";
import {
  resolveSandbox,
  resolveCd,
  execInSandbox,
  createSandbox,
  isGoneError,
  HOME_DIR,
  createStreamWritable,
} from "@/lib/sandbox";
import { COOKIE_NAMES, cookieOpts } from "@/lib/cookies";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Streams a student command through the session's Linux sandbox.
 * - `cd` is resolved server-side (so the working directory persists across
 *   requests) and returns 204 with updated cookies.
 * - Any other command streams combined stdout/stderr, terminated by a control
 *   token `\0LP:EXIT=<code>\0` so the client knows the command finished.
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
  const cwd = req.cookies.get(COOKIE_NAMES.cwd)?.value || DEFAULT_CWD;
  const prev = req.cookies.get(COOKIE_NAMES.prev)?.value || "";

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

  // Resolve the sandbox up front so we know the (possibly new) id synchronously
  // and can persist it in the Set-Cookie header before the body is streamed.
  let sandbox;
  let sandboxId: string;
  let reused = false;
  try {
    const resolved = await resolveSandbox(cookieSandboxId);
    sandbox = resolved.sandbox;
    sandboxId = resolved.sandboxId;
    reused = !resolved.created; // a reused sandbox may have expired -> retry once
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
          // fresh one and retry exactly once; a brand-new sandbox should not 410.
          if (isGoneError(err) && reused) {
            const fresh = await createSandbox();
            sandboxId = fresh.sandboxId;
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
