import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import type { ReadableStreamDefaultController } from "stream/web";
import { Sandbox, type Sandbox as SandboxType } from "@vercel/sandbox";
import { HOME_DIR, resolveCd } from "./path-util";

/**
 * Server-side sandbox lifecycle for the Linux practice lab.
 *
 * Each browser session owns exactly one persistent Vercel Sandbox, identified
 * by a random name stored in an httpOnly cookie. The SDK resumes the same
 * microVM across requests (filesystem snapshot is restored automatically), so
 * a student's files and working directory survive between commands.
 */

export const SANDBOX_RUNTIME = "node22" as const;

/**
 * Hard wall-clock guard so a hung/interactive program cannot block a request.
 * Override with COMMAND_TIMEOUT_MS (must stay under the route's maxDuration).
 */
export function commandTimeoutMs(): number {
  const fromEnv = Number(process.env.COMMAND_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 60_000;
}

export function newSandboxName(): string {
  const id = randomUUID().replace(/-/g, "").slice(0, 24);
  return `lp-${id}`;
}

export async function getOrCreateSandbox(name: string): Promise<SandboxType> {
  return Sandbox.getOrCreate({
    name,
    runtime: SANDBOX_RUNTIME,
    onCreate: async (sbx) => {
      // Fresh environment: create a friendly working directory.
      await sbx.runCommand({ cmd: "mkdir", args: ["-p", `${HOME_DIR}/practice`] });
    },
  });
}

/**
 * Resolve a `cd` command against the current directory WITHOUT executing it,
 * so the working directory persists across HTTP requests (the sandbox has no
 * long-lived interactive shell). Implemented in ./path-util (shared with the
 * browser terminal) and re-exported here for the server.
 */
export { resolveCd };

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
