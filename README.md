# Linux Practice Lab

> 🌏 **Read this in another language:** [简体中文](./README.zh-CN.md)

> Learn Linux by doing — a real shell in your browser, powered by [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox).

Every student session runs inside an isolated, ephemeral **Amazon Linux 2023 microVM** created on demand by Vercel Sandbox. There is nothing to install and no VM to configure — open the page, type a command, and it executes on a real Linux kernel.

---

## ✨ Features

- **Real Linux, real shell** — commands run in a genuine microVM (not an emulator), with `bash`, pipes, redirections, `sudo`, and `dnf` available.
- **Persistent per-session sandbox** — your files and working directory survive between commands; the microVM snapshots automatically and resumes.
- **Interactive terminal** — an [xterm.js](https://xtermjs.org/) terminal with live, streamed output, command history (↑/↓), and `cd` support.
- **Bilingual curriculum with auto-grading** — 12 hands-on lessons from navigation to shell scripting, each verified automatically inside the sandbox.
- **English + Chinese UI** — switch languages anytime; all lessons and hints are bilingual.
- **MIT licensed** — free to use, modify, and redistribute.
- **Login + teacher dashboard (optional)** — students sign in with GitHub; teachers create classes, share an invite code, assign lessons, and see a per-student completion matrix. All auth/DB features **degrade gracefully** — without config the app still runs in anonymous mode (cookie-scoped sandbox + `localStorage` progress).

---

## 🧱 How it works

```text
 Browser (xterm.js)                Next.js (Vercel)                Vercel Sandbox
 ┌──────────────┐   POST /api/exec  ┌──────────────────┐  Sandbox.getOrCreate   ┌─────────────────┐
 │ type `ls -la` │ ───────────────▶ │ resume sandbox by │ ───────────────────▶ │ Amazon Linux    │
 │              │ ◀─────────────── │ name (cookie)    │ ◀─────────────────── │ microVM         │
 │ streamed out │   stream chunks   │ runCommand(...)  │   bash -lc "..."      │  real bash + fs │
 └──────────────┘                  └──────────────────┘                       └─────────────────┘
```

1. On first load the browser asks the server to create (or resume) a sandbox identified by a random name stored in an httpOnly cookie.
2. Each command is sent to `POST /api/exec`. The server resumes the same microVM and streams combined stdout/stderr back to the terminal.
3. Student input is passed as an argv element (never string-interpolated), so there is **no shell-injection surface**. A `timeout` wrapper kills any command that runs longer than 60s.

---

## 🚀 Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Link to a Vercel project (creates auth tokens for the sandbox)
vercel link
vercel env pull        # writes VERCEL_OIDC_TOKEN into .env.local

# 3. Run the dev server
npm run dev            # http://localhost:3000
```

Requirements: **Node.js 22+** and a Vercel account. Local authentication uses the OIDC token from `vercel env pull`; in production on Vercel this is handled automatically.

---

## ☁️ Deploy to Vercel

```bash
# Option A — Vercel CLI
vercel deploy --prod

# Option B — push to GitHub and import the repo in the Vercel dashboard
git push -u origin main
```

On Vercel, **no environment variables are required** — the SDK reads the project's OIDC token automatically. (If you prefer explicit credentials, copy `.env.example` to `.env.local` and fill `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN`.)

> ⏱️ **Timeout note:** a single command may run up to `COMMAND_TIMEOUT_MS` (default 60 000 ms). The route's `maxDuration` is 60s. On Vercel Hobby the function timeout ceiling may be lower — reduce `COMMAND_TIMEOUT_MS` if commands are cut off early.

---

## 🌐 Custom domain: linux.qiyuan.icu

1. In the Vercel dashboard, open your project → **Settings → Domains**.
2. Add `linux.qiyuan.icu`. Vercel will show the DNS records to configure.
3. In your DNS provider for `qiyuan.icu`, point the host to Vercel:

   | Type    | Name    | Value                  |
   | ------- | ------- | ---------------------- |
   | `CNAME` | `linux` | `cname.vercel-dns.com` |

   (Or use the `A` record `76.76.21.21` if your provider prefers it.)

4. Wait for propagation (usually < 10 min). The certificate is issued automatically.

Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_REPO_URL` in the Vercel project environment if you want absolute links/metadata to reflect your domain and repository.

---

## 🧑‍🏫 Classroom mode (teachers)

The lab is usable solo, but it becomes a real teaching tool once you enable login. With `NEXT_PUBLIC_AUTH_ENABLED=true` (and the env vars below), the app gains:

- **GitHub sign-in** — students and teachers log in with GitHub OAuth. The **first person to sign in becomes the teacher**; everyone after is a student.
- **Classes** — a teacher creates a class and gets a short shareable **invite code**. Students join with the code (no approval needed).
- **Lesson assignment** — the teacher picks which of the 12 lessons are required for a class.
- **Completion matrix** — the class page shows every member × assigned lesson as done / not-done, sourced from **server-side progress** (survives device switches, unlike the anonymous `localStorage` mode).
- **Per-user sandbox** — once logged in, a student's sandbox id is stored against their account, so their environment follows them across devices and browsers (anonymous mode keys the sandbox to a cookie only).

> Without these env vars the app runs in **anonymous mode**: each browser gets its own cookie-scoped sandbox and progress is saved in `localStorage`. Nothing breaks — you just don't get identity, classes, or the teacher view.

### Enable it

1. Create a **GitHub OAuth App** (GitHub → Settings → Developer settings → OAuth Apps → New OAuth App).
   - **Homepage URL:** `https://<your-domain>` (e.g. `https://linux.qiyuan.icu`)
   - **Authorization callback URL:** `https://<your-domain>/api/auth/callback/github`
   - Copy the **Client ID** and generate a **Client Secret**.
2. Create a **Neon Postgres** database (free tier). Copy the connection string (use the pooled `*-pooler*` endpoint).
3. Set these environment variables in the Vercel dashboard (or copy `.env.example` → `.env.local`):

   | Variable                  | Required | Notes                                              |
   | ------------------------- | -------- | -------------------------------------------------- |
   | `NEXT_PUBLIC_AUTH_ENABLED` | yes      | Set to `true` to turn on login + classroom features. |
   | `AUTH_SECRET`             | yes      | `openssl rand -base64 32`                          |
   | `GITHUB_CLIENT_ID`        | yes      | from the GitHub OAuth App                          |
   | `GITHUB_CLIENT_SECRET`    | yes      | from the GitHub OAuth App                          |
   | `DATABASE_URL`            | yes      | Neon Postgres connection string                   |

4. Redeploy. The schema (`users`, `userSandbox`, `userProgress`, `classes`, `classMembers`, `classAssignments`) is created automatically on first request — `ensureSchema()` is idempotent.

> The Vercel Sandbox SDK still reads the project's OIDC token automatically; no sandbox-related env var is needed for classroom mode.

---

## 📚 Lessons

| Level | Topic             | Lessons                                                  |
| ----- | ----------------- | ------------------------------------------------------- |
| 1     | Navigation        | Create a directory · Move with `cd` · List hidden files |
| 2     | Files & content   | Create/view · Copy · Move & remove                      |
| 3     | Permissions       | Make a script executable (`chmod +x`)                   |
| 4     | Text processing   | Filter with `grep` · Count with `wc`                    |
| 5     | Pipes             | Count matches with a pipe                               |
| 6     | Archives          | `tar -czf` a directory                                  |
| 7     | Shell basics      | Write a `for` loop script                               |

Each lesson has setup commands (run on "Set up environment") and a `verify` command (run on "Verify") that exits 0 only when the task is solved. Verification runs **inside the student's own sandbox**, so it checks real filesystem state.

---

## 🗂️ Project structure

```text
app/
  api/
    auth/[...nextauth]/route.ts  # Auth.js (GitHub OAuth) handlers
    session/route.ts             # create/resume/reset a sandbox (cookie or DB)
    exec/route.ts                # stream a command through the sandbox
    complete/route.ts            # run tab-completion via bash compgen
    progress/route.ts            # GET/POST server-side lesson progress
    lesson/start/route.ts        # run a lesson's setup commands
    lesson/verify/route.ts       # run a lesson's verify command
    classes/route.ts             # teacher: create class; GET my classes
    classes/join/route.ts        # student: join by invite code
    classes/[id]/route.ts        # class detail + teacher lesson assignment
  teacher/page.tsx               # create / join / list classes
  class/[id]/page.tsx            # per-student completion matrix (teacher)
  layout.tsx, page.tsx, globals.css
auth.ts                          # Auth.js config (GitHub, JWT session, first=tteacher)
components/
  Terminal.tsx                   # xterm.js terminal + line editor + history
  LessonPanel.tsx                # bilingual lesson list, hints, solution, verify
  Header.tsx, AuthButton.tsx     # header + GitHub sign-in / teacher nav
  LangProvider.tsx
db/
  schema.ts                      # Drizzle tables (users, sandbox, progress, classes…)
  index.ts                       # neon() http client; db is null when DATABASE_URL missing
  ensure.ts                      # idempotent CREATE TABLE IF NOT EXISTS
lib/
  sandbox.ts                     # Vercel Sandbox lifecycle + streaming exec
  identity.ts                    # resolve user id; load/save sandbox to DB or cookie
  lessons.ts                     # bilingual curriculum (setup/verify/hints)
  i18n.ts                        # UI string dictionary (en primary, zh secondary)
  path-util.ts                   # client-safe cwd / `cd` resolver (shared)
  cookies.ts                     # session cookie names + options
types/next-auth.d.ts             # Session.userId / role augmentation
```

The UI is bilingual: `lib/i18n.ts` holds UI strings (English primary), and `lib/lessons.ts` holds lesson content in both languages. Toggle with the **EN / 中文** switch in the header.

---

## 🤝 Contributing

Contributions are welcome! Add lessons in `lib/lessons.ts` (keep both `en` and `zh`), or improve the terminal/UX. Please open an issue or PR.

---

## 📄 License

[MIT](./LICENSE) © 2026 violet27chen

Released under the MIT License — free for personal and commercial use, modification, and redistribution.
