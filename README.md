# Linux Practice Lab

> Learn Linux by doing — a real shell in your browser, powered by [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox).

**Linux 练习实验室** —— 在浏览器里用真实 Linux 终端练习命令，底层由 Vercel Sandbox 提供的隔离微虚拟机驱动，无需安装、无需配置。

Every student session runs inside an isolated, ephemeral **Amazon Linux 2023 microVM** created on demand by Vercel Sandbox. There is nothing to install and no VM to configure — open the page, type a command, and it executes on a real Linux kernel.

每个学生会话都在一个隔离、临时的 **Amazon Linux 2023 微虚拟机** 中运行，由 Vercel Sandbox 按需创建。无需安装任何东西，也无需配置虚拟机——打开页面、输入命令，即在真实 Linux 内核上执行。

---

## ✨ Features / 功能特性

- **Real Linux, real shell** — commands run in a genuine microVM (not an emulator), with `bash`, pipes, redirections, `sudo`, and `dnf` available.
  真实 Linux、真实 shell —— 命令在真正的微虚拟机中运行（非模拟器），支持 `bash`、管道、重定向、`sudo` 与 `dnf`。
- **Persistent per-session sandbox** — your files and working directory survive between commands; the microVM snapshots automatically and resumes.
  会话级持久沙盒 —— 你的文件与工作目录在多次命令之间保留；微虚拟机会自动快照并恢复。
- **Interactive terminal** — an [xterm.js](https://xtermjs.org/) terminal with a live, streamed output, command history (↑/↓), and `cd` support.
  交互式终端 —— 基于 xterm.js，实时流式输出，支持命令历史（↑/↓）与 `cd`。
- **Bilingual curriculum with auto-grading** — 12 hands-on lessons from navigation to shell scripting, each verified automatically inside the sandbox.
  双语课程体系 + 自动判题 —— 12 个从目录导航到 Shell 脚本的实操关卡，每关在沙盒内自动校验。
- **English + Chinese UI** — switch languages anytime; all lessons and hints are bilingual.
  中英文界面 —— 随时切换语言；所有课程与提示均为双语。
- **MIT licensed** — free to use, modify, and redistribute.
  MIT 协议开源 —— 可自由使用、修改与再分发。

---

## 🧱 How it works / 工作原理

```text
 Browser (xterm.js)                Next.js (Vercel)                Vercel Sandbox
 ┌──────────────┐   POST /api/exec  ┌──────────────────┐  Sandbox.getOrCreate   ┌─────────────────┐
 │ type `ls -la` │ ───────────────▶ │ resume sandbox by │ ───────────────────▶ │ Amazon Linux    │
 │              │ ◀─────────────── │ name (cookie)    │ ◀─────────────────── │ microVM         │
 │ streamed out │   stream chunks   │ runCommand(...)  │   bash -lc "..."      │  real bash + fs │
 └──────────────┘                  └──────────────────┘                       └─────────────────┘
```

1. On first load the browser asks the server to create (or resume) a sandbox identified by a random name stored in an httpOnly cookie.
   首次加载时，浏览器请求服务端创建（或恢复）一个沙盒，其名称是随机生成、存于 httpOnly Cookie 的标识。
2. Each command is sent to `POST /api/exec`. The server resumes the same microVM and streams combined stdout/stderr back to the terminal.
   每条命令发往 `POST /api/exec`。服务端恢复同一个微虚拟机，并将标准输出/错误实时流式回传终端。
3. Student input is passed as an argv element (never string-interpolated), so there is **no shell-injection surface**. A `timeout` wrapper kills any command that runs longer than 60s.
   学生输入以参数形式传递（绝不拼接进 shell），因此**不存在命令注入风险**。外层 `timeout` 会在命令超过 60 秒时将其终止。

---

## 🚀 Quick start (local) / 本地运行

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

环境要求：**Node.js 22+** 与 Vercel 账号。本地鉴权使用 `vercel env pull` 生成的 OIDC Token；部署到 Vercel 后由平台自动管理。

---

## ☁️ Deploy to Vercel / 部署到 Vercel

```bash
# Option A — Vercel CLI
vercel deploy --prod

# Option B — push to GitHub and import the repo in the Vercel dashboard
git push -u origin main
```

On Vercel, **no environment variables are required** — the SDK reads the project's OIDC token automatically. (If you prefer explicit credentials, copy `.env.example` to `.env.local` and fill `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN`.)

部署到 Vercel **无需配置任何环境变量** —— SDK 会自动读取项目的 OIDC Token。（如需显式凭证，可将 `.env.example` 复制为 `.env.local` 并填入相应字段。）

> ⏱️ **Timeout note:** a single command may run up to `COMMAND_TIMEOUT_MS` (default 60 000 ms). The route's `maxDuration` is 60s. On Vercel Hobby the function timeout ceiling may be lower — reduce `COMMAND_TIMEOUT_MS` if commands are cut off early.
> ⏱️ **超时说明：** 单条命令最长运行 `COMMAND_TIMEOUT_MS`（默认 60 000 毫秒），路由 `maxDuration` 为 60 秒。Vercel Hobby 计划的函数超时上限可能更低——若命令被提前中断，请调小 `COMMAND_TIMEOUT_MS`。

---

## 🌐 Custom domain: linux.qiyuan.icu / 自定义域名

1. In the Vercel dashboard, open your project → **Settings → Domains**.
   在 Vercel 控制台打开项目 → **Settings → Domains**。
2. Add `linux.qiyuan.icu`. Vercel will show the DNS records to configure.
   添加 `linux.qiyuan.icu`，Vercel 会显示需要配置的 DNS 记录。
3. In your DNS provider for `qiyuan.icu`, point the host to Vercel:
   在 `qiyuan.icu` 的 DNS 服务商处，将该主机指向 Vercel：

   | Type  | Name      | Value                                              |
   | ----- | --------- | -------------------------------------------------- |
   | `CNAME` | `linux` | `cname.vercel-dns.com`                            |

   (Or use the `A` record `76.76.21.21` if your provider prefers it.)
   （若服务商更偏好 A 记录，也可使用 `76.76.21.21`。）

4. Wait for propagation (usually < 10 min). The certificate is issued automatically.
   等待 DNS 生效（通常 < 10 分钟）。SSL 证书会自动签发。

Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_REPO_URL` in the Vercel project environment if you want absolute links/metadata to reflect your domain and repository.
如需绝对链接/元数据指向你的域名与仓库，可在 Vercel 项目环境中设置 `NEXT_PUBLIC_SITE_URL` 与 `NEXT_PUBLIC_REPO_URL`。

---

## 📚 Lessons / 课程一览

| Level | Topic (EN)        | 主题（中文）   | Lessons                                                            |
| ----- | ----------------- | -------------- | ------------------------------------------------------------------ |
| 1     | Navigation        | 目录导航       | Create a directory · Move with `cd` · List hidden files           |
| 2     | Files & content   | 文件与内容     | Create/view · Copy · Move & remove                                |
| 3     | Permissions       | 权限管理       | Make a script executable (`chmod +x`)                             |
| 4     | Text processing   | 文本处理       | Filter with `grep` · Count with `wc`                              |
| 5     | Pipes             | 管道与重定向   | Count matches with a pipe                                         |
| 6     | Archives          | 归档压缩       | `tar -czf` a directory                                             |
| 7     | Shell basics      | Shell 基础     | Write a `for` loop script                                          |

Each lesson has setup commands (run on "Set up environment") and a `verify` command (run on "Verify") that exits 0 only when the task is solved. Verification runs **inside the student's own sandbox**, so it checks real filesystem state.
每关包含初始化命令（“初始化环境”时执行）与校验命令（“校验”时执行），仅当任务完成时校验命令退出码为 0。校验在**学生自己的沙盒内**运行，因此检验的是真实文件系统状态。

---

## 🗂️ Project structure / 项目结构

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
界面为双语：`lib/i18n.ts` 存放界面文案（英文为主），`lib/lessons.ts` 存放双语课程内容。通过页头 **EN / 中文** 开关切换。

---

## 🤝 Contributing / 贡献

Contributions are welcome! Add lessons in `lib/lessons.ts` (keep both `en` and `zh`), or improve the terminal/UX. Please open an issue or PR.

欢迎贡献！可在 `lib/lessons.ts` 中添加关卡（请同时提供 `en` 与 `zh` 文案），或改进终端与交互。请提交 Issue 或 PR。

---

## 📄 License / 许可证

[MIT](./LICENSE) © 2026 qiyuan

Released under the MIT License — free for personal and commercial use, modification, and redistribution.
基于 MIT 协议发布 —— 可自由用于个人与商业用途、修改与再分发。
