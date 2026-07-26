// Shared cookie names + options for the per-session sandbox.
// These are httpOnly: the browser never reads them, only the server does.

export const COOKIE_NAMES = {
  sandbox: "lp_sandbox",
  cwd: "lp_cwd",
  prev: "lp_prev",
} as const;

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}
