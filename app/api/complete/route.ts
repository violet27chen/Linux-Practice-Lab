import { NextRequest, NextResponse } from "next/server";
import { Writable } from "node:stream";
import {
  resolveSandbox,
  createSandbox,
  isGoneError,
  sandboxTimeoutMs,
  remainingTimeoutMs,
  HOME_DIR,
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
export const maxDuration = 30;

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const DEFAULT_CWD = `${HOME_DIR}/practice`;

/**
 * Tab-completion backend for the custom terminal line editor.
 * Mirrors the exec route's identity resolution: logged-in users use their DB
 * sandbox id, anonymous users use the cookie. Recreates a reused sandbox once
 * on a 410 (expired) and persists the new id.
 */
const SCRIPT = `
if [ "$2" = "cmd" ]; then
  compgen -c -- "$1"
  compgen -abk -- "$1"
else
  if [ "$3" = "dir" ]; then
    compgen -d -- "$1"
  else
    compgen -f -- "$1"
    printf '\\n__DIR__\\n'
    compgen -d -- "$1"
  fi
fi`;

export async function POST(req: NextRequest) {
  let body: { line?: string; cursor?: number };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const line = String(body.line ?? "");
  const cursor = Math.min(
    Math.max(0, Number(body.cursor ?? line.length) || 0),
    line.length,
  );
  const cookieSandboxId = req.cookies.get(COOKIE_NAMES.sandbox)?.value ?? null;
  const cwd = req.cookies.get(COOKIE_NAMES.cwd)?.value || DEFAULT_CWD;

  try {
    await ensureSchema();
  } catch {
    /* db not configured -> anonymous mode */
  }

  const userId = await resolveUserId();
  if (AUTH_ENABLED && !userId) {
    return new NextResponse("[error] 请先登录后再使用终端。", { status: 401 });
  }
  let timeoutMs = sandboxTimeoutMs();
  if (AUTH_ENABLED) {
    const ac = await getActiveClassForUser(userId!);
    if (!ac) {
      return new NextResponse("[error] 请先加入一个由教师开堂的活跃课堂。", {
        status: 403,
      });
    }
    timeoutMs = remainingTimeoutMs(ac.endsAt);
  }
  const dbSb = userId ? await getDbSandbox(userId) : null;
  const effectiveId = dbSb?.sandboxId ?? cookieSandboxId ?? null;

  const before = line.slice(0, cursor);
  const m = before.match(/(\S*)$/);
  const word = m ? m[1] : "";
  const trimmed = before.trim();
  const isCommand = trimmed === word;
  const firstToken = trimmed.split(/\s+/)[0] ?? "";
  const dirsOnly = firstToken === "cd" || firstToken === "pushd";
  const mode = isCommand ? "cmd" : "arg";
  const dirFlag = dirsOnly ? "dir" : "file";

  let resolved: Awaited<ReturnType<typeof resolveSandbox>>;
  try {
    resolved = await resolveSandbox(effectiveId, timeoutMs);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`[error] ${message}`, { status: 500 });
  }

  const chunks: Buffer[] = [];
  const cap = new Writable({
    write(c, _enc, cb) {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      cb();
    },
  });

  const runCompletion = (sb: typeof resolved.sandbox) =>
    sb.runCommand({
      cmd: "bash",
      args: ["-lc", SCRIPT, "sh", word, mode, dirFlag],
      cwd,
      stdout: cap,
      stderr: cap,
    });

  try {
    try {
      await runCompletion(resolved.sandbox);
    } catch (err) {
      if (isGoneError(err) && !resolved.created) {
        const fresh = await createSandbox(timeoutMs);
        if (userId) await saveDbSandbox(userId, fresh.sandboxId, cwd);
        resolved = {
          sandbox: fresh,
          sandboxId: fresh.sandboxId,
          created: true,
        };
        await runCompletion(fresh);
      } else {
        throw err;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`[error] ${message}`, { status: 500 });
  }

  const out = Buffer.concat(chunks).toString("utf8");
  let candidates: string[];
  if (dirsOnly || isCommand) {
    candidates = out.split("\n").map((s) => s.trim()).filter(Boolean);
  } else {
    const idx = out.indexOf("__DIR__");
    const filesPart = idx === -1 ? out : out.slice(0, idx);
    const dirsPart = idx === -1 ? "" : out.slice(idx + "__DIR__".length);
    const set = new Set<string>();
    for (const f of filesPart.split("\n").map((s) => s.trim()).filter(Boolean)) {
      set.add(f);
    }
    for (const d of dirsPart.split("\n").map((s) => s.trim()).filter(Boolean)) {
      set.add(d.endsWith("/") ? d : d + "/");
    }
    candidates = Array.from(set);
  }

  candidates = Array.from(new Set(candidates)).slice(0, 200);

  const res = NextResponse.json({ ok: true, candidates, isCommand });
  if (resolved.created) {
    if (userId) await saveDbSandbox(userId, resolved.sandboxId, cwd);
    res.cookies.set(COOKIE_NAMES.sandbox, resolved.sandboxId, cookieOpts());
    res.cookies.set(COOKIE_NAMES.cwd, DEFAULT_CWD, cookieOpts());
  }
  return res;
}
