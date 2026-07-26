import { Writable } from "node:stream";
import type { ReadableStreamDefaultController } from "stream/web";
import { Sandbox, type Sandbox as SandboxType } from "@vercel/sandbox";
import { HOME_DIR, resolveCd } from "./path-util";

// Re-export for server-side consumers (API routes import these from lib/sandbox).
export { HOME_DIR, resolveCd };

/**
 * Server-side sandbox lifecycle for the Linux practice lab.
 *
 * Each browser session owns exactly one Vercel Sandbox, identified by its
 * `sandboxId` stored in an httpOnly cookie. We resume the same microVM across
 * requests with `Sandbox.get({ sandboxId })`; if it can no longer be reached
 * (expired / stopped), we transparently create a fresh one. A student's files
 * and working directory survive for the lifetime of the sandbox.
 *
 * NOTE: @vercel/sandbox v1.x exposes `Sandbox.create()` and
 * `Sandbox.get({ sandboxId })` — there is no name-based `getOrCreate`, so we
 * implement that pattern ourselves on top of the sandbox id.
 */

export const SANDBOX_RUNTIME = "node22" as const;

/**
 * Sandbox wall-clock lifetime in milliseconds. Vercel caps this at 45 min on
 * Hobby and 5 h on Pro. Override with SANDBOX_TIMEOUT_MS.
 */
export function sandboxTimeoutMs(): number {
  const fromEnv = Number(process.env.SANDBOX_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 45 * 60_000;
}

/**
 * Sandbox lifetime for a class member: the time left until the class ends,
 * capped at the platform maximum (`sandboxTimeoutMs`). Guarantees a sane
 * minimum so a just-expired class still gets a 1-minute sandbox if re-created.
 */
export function remainingTimeoutMs(endsAt: number | null): number {
  const cap = sandboxTimeoutMs();
  if (!endsAt) return cap;
  const remaining = endsAt - Date.now();
  return remaining > 60_000 ? Math.min(remaining, cap) : 60_000;
}

/**
 * True when an error means the sandbox is gone and must be recreated.
 *
 * @vercel/sandbox's base API client throws `Status code 410 is not ok`
 * (base-client.js:86) — and similar 4xx — when the underlying microVM has
 * expired or been reclaimed. `Sandbox.get` returns a proxy for such a sandbox
 * WITHOUT checking liveness, so the failure only surfaces at `runCommand`
 * time. We use this predicate to transparently recreate + retry there.
 */
export function isGoneError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b410\b|\bgone\b|status code 4\d\d/i.test(msg);
}

/**
 * Hard wall-clock guard so a hung/interactive program cannot block a request.
 * Override with COMMAND_TIMEOUT_MS (must stay under the route's maxDuration).
 */
export function commandTimeoutMs(): number {
  const fromEnv = Number(process.env.COMMAND_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 60_000;
}

/** Create a brand-new sandbox and prepare a friendly working directory.
 *  `timeoutMs` overrides the default wall-clock lifetime (used to tie a
 *  student's sandbox to the remaining time of their active class). */
export async function createSandbox(timeoutMs?: number): Promise<SandboxType> {
  const sandbox = await Sandbox.create({
    runtime: SANDBOX_RUNTIME,
    timeout: timeoutMs ?? sandboxTimeoutMs(),
  });
  await sandbox.runCommand({ cmd: "mkdir", args: ["-p", `${HOME_DIR}/practice`] });
  return sandbox;
}

/** Stop (reclaim) a sandbox by id. Best-effort: a missing/expired sandbox is
 *  treated as already gone. Used when a class ends and member machines are
 *  destroyed. */
export async function destroySandbox(sandboxId: string): Promise<void> {
  try {
    const sb = await Sandbox.get({ sandboxId });
    await sb.stop();
  } catch {
    // Already stopped / expired / not found — nothing to do.
  }
}

/** Resume an existing sandbox by id (throws if it cannot be reached). */
export async function getSandbox(sandboxId: string): Promise<SandboxType> {
  return Sandbox.get({ sandboxId });
}

/**
 * Resolve the session's sandbox from the cookie id: reuse it when possible,
 * otherwise create a fresh one. Returns the sandbox plus its (possibly new) id
 * and whether it was just created, so the caller can refresh the cookie.
 */
export async function resolveSandbox(
  sandboxId: string | null | undefined,
  timeoutMs?: number,
): Promise<{ sandbox: SandboxType; sandboxId: string; created: boolean }> {
  if (sandboxId) {
    try {
      const sandbox = await getSandbox(sandboxId);
      return { sandbox, sandboxId, created: false };
    } catch {
      // Sandbox expired or is otherwise unreachable — fall through and recreate.
    }
  }
  const sandbox = await createSandbox(timeoutMs);
  return { sandbox, sandboxId: sandbox.sandboxId, created: true };
}

/** Streaming writer that forwards sandbox output chunks to a web ReadableStream. */
export function createStreamWritable(
  controller: ReadableStreamDefaultController<Uint8Array>,
): Writable {
  return new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      const bytes =
        typeof chunk === "string"
          ? new TextEncoder().encode(chunk)
          : new Uint8Array(chunk);
      controller.enqueue(bytes);
      callback();
    },
  });
}

/**
 * Run an arbitrary student command in the sandbox and stream its combined
 * stdout/stderr to the supplied writers. Student input is passed as an argv
 * element (never string-interpolated into a shell), so there is no command
 * injection surface. A `timeout` wrapper guarantees the command cannot hang.
 */
export async function execInSandbox(
  sandbox: SandboxType,
  userCommand: string,
  cwd: string,
  stdout: Writable,
  stderr: Writable,
): Promise<number> {
  const timeoutSec = Math.floor(commandTimeoutMs() / 1000);
  const script = `timeout ${timeoutSec} bash -c "$1"`;

  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", script, "sh", userCommand],
    cwd,
    stdout,
    stderr,
  });

  return result.exitCode ?? 0;
}

/** Run a command and capture its full output (used for lesson setup/verify). */
export async function runCapture(
  sandbox: SandboxType,
  command: string,
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", 'bash -c "$1"', "sh", command],
    cwd,
  });

  return {
    exitCode: result.exitCode ?? 0,
    stdout: (await result.stdout()) ?? "",
    stderr: (await result.stderr()) ?? "",
  };
}
