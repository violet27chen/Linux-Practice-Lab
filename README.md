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
    session/route.ts     # create/resume/reset a sandbox (cookie)
    exec/route.ts        # stream a command through the sandbox
    lesson/start.ts      # run a lesson's setup commands
    lesson/verify.ts     # run a lesson's verify command
  layout.tsx, page.tsx, globals.css
components/
  Terminal.tsx           # xterm.js terminal + line editor + history
  LessonPanel.tsx        # bilingual lesson list, hints, solution, verify
  Header.tsx, LangProvider.tsx
lib/
  sandbox.ts             # Vercel Sandbox lifecycle + streaming exec
  lessons.ts             # bilingual curriculum (setup/verify/hints)
  i18n.ts                # UI string dictionary (en primary, zh secondary)
  path-util.ts           # client-safe cwd / `cd` resolver (shared)
  cookies.ts             # session cookie names + options
```

The UI is bilingual: `lib/i18n.ts` holds UI strings (English primary), and `lib/lessons.ts` holds lesson content in both languages. Toggle with the **EN / 中文** switch in the header.

---

## 🤝 Contributing

Contributions are welcome! Add lessons in `lib/lessons.ts` (keep both `en` and `zh`), or improve the terminal/UX. Please open an issue or PR.

---

## 📄 License

[MIT](./LICENSE) © 2026 violet27chen

Released under the MIT License — free for personal and commercial use, modification, and redistribution.
