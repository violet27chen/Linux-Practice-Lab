// Client-safe POSIX path helpers shared by the browser terminal and the
// server sandbox manager, so the working directory stays in sync across
// requests without pulling in any Node.js-only modules.

export const HOME_DIR = "/vercel/sandbox";

function normalize(absPath: string): string {
  const stack: string[] = [];
  for (const seg of absPath.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return "/" + stack.join("/");
}

/**
 * Resolve a `cd` argument against the current directory. Returns null when the
 * input is not a `cd` command. `home` is the user's home directory.
 */
export function resolveCd(
  input: string,
  cwd: string,
  prev: string | null,
  home: string,
): { cwd: string; prev: string } | null {
  const m = input.trim().match(/^cd(?:\s+(.*))?$/);
  if (!m) return null;

  const target = (m[1] ?? "").trim();
  if (target === "" || target === "~") {
    return { cwd: home, prev: cwd };
  }
  if (target === "-") {
    return prev ? { cwd: prev, prev: cwd } : { cwd, prev: cwd };
  }

  let abs: string;
  if (target.startsWith("/")) abs = target;
  else if (target.startsWith("~")) abs = home + target.slice(1);
  else abs = cwd.endsWith("/") ? cwd + target : cwd + "/" + target;

  return { cwd: normalize(abs), prev: cwd };
}

/** Render a working directory as a shell prompt prefix (~ for home). */
export function promptCwd(cwd: string): string {
  if (cwd === HOME_DIR) return "~";
  if (cwd.startsWith(HOME_DIR + "/")) return "~" + cwd.slice(HOME_DIR.length);
  return cwd;
}
