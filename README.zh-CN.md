# Linux 练习实验室

> 🌏 **切换语言：** [English](./README.md)

> 在浏览器里用真实 Linux 终端练习命令，底层由 [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) 提供的隔离微虚拟机驱动，无需安装、无需配置。

每个学生会话都在一个隔离、临时的 **Amazon Linux 2023 微虚拟机** 中运行，由 Vercel Sandbox 按需创建。无需安装任何东西，也无需配置虚拟机——打开页面、输入命令，即在真实 Linux 内核上执行。

---

## ✨ 功能特性

- **真实 Linux、真实 shell** —— 命令在真正的微虚拟机中运行（非模拟器），支持 `bash`、管道、重定向、`sudo` 与 `dnf`。
- **会话级持久沙盒** —— 你的文件与工作目录在多次命令之间保留；微虚拟机会自动快照并恢复。
- **交互式终端** —— 基于 [xterm.js](https://xtermjs.org/)，实时流式输出，支持命令历史（↑/↓）与 `cd`。
- **双语课程体系 + 自动判题** —— 12 个从目录导航到 Shell 脚本的实操关卡，每关在沙盒内自动校验。
- **中英文界面** —— 随时切换语言；所有课程与提示均为双语。
- **MIT 协议开源** —— 可自由使用、修改与再分发。
- **登录 + 教师后台（可选）** —— 学生用 GitHub 登录；教师可创建班级、分享邀请码、设置每班任务与校验命令、运行限时沙盒，并查看每名学生的完成度矩阵。所有登录/数据库功能**优雅降级**——未配置时应用仍以匿名模式运行（Cookie 沙盒 + `localStorage` 进度）。

---

## 🧱 工作原理

```text
 浏览器 (xterm.js)                  Next.js (Vercel)                 Vercel Sandbox
 ┌──────────────┐   POST /api/exec  ┌──────────────────┐  Sandbox.getOrCreate   ┌─────────────────┐
 │ 输入 `ls -la` │ ───────────────▶ │ 按 Cookie 名称    │ ───────────────────▶ │ Amazon Linux    │
 │              │ ◀─────────────── │ 恢复沙盒         │ ◀─────────────────── │ 微虚拟机        │
 │ 流式输出     │   分块流式回传    │ runCommand(...)  │   bash -lc "..."      │ 真实 bash + fs  │
 └──────────────┘                  └──────────────────┘                       └─────────────────┘
```

1. 首次加载时，浏览器请求服务端创建（或恢复）一个沙盒，其名称是随机生成、存于 httpOnly Cookie 的标识。
2. 每条命令发往 `POST /api/exec`。服务端恢复同一个微虚拟机，并将标准输出/错误实时流式回传终端。
3. 学生输入以参数形式传递（绝不拼接进 shell），因此**不存在命令注入风险**。外层 `timeout` 会在命令超过 60 秒时将其终止。

---

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 关联到 Vercel 项目（为沙盒生成鉴权 Token）
vercel link
vercel env pull        # 将 VERCEL_OIDC_TOKEN 写入 .env.local

# 3. 启动开发服务器
npm run dev            # http://localhost:3000
```

环境要求：**Node.js 22+** 与 Vercel 账号。本地鉴权使用 `vercel env pull` 生成的 OIDC Token；部署到 Vercel 后由平台自动管理。

---

## ☁️ 部署到 Vercel

```bash
# 方式 A —— Vercel CLI
vercel deploy --prod

# 方式 B —— 推送到 GitHub，在 Vercel 控制台导入仓库
git push -u origin main
```

部署到 Vercel **无需配置任何环境变量** —— SDK 会自动读取项目的 OIDC Token。（如需显式凭证，可将 `.env.example` 复制为 `.env.local` 并填入 `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN`。）

> ⏱️ **超时说明：** 单条命令最长运行 `COMMAND_TIMEOUT_MS`（默认 60 000 毫秒），路由 `maxDuration` 为 60 秒。Vercel Hobby 计划的函数超时上限可能更低——若命令被提前中断，请调小 `COMMAND_TIMEOUT_MS`。

---

## 🌐 自定义域名：linux.qiyuan.icu

1. 在 Vercel 控制台打开项目 → **Settings → Domains**。
2. 添加 `linux.qiyuan.icu`，Vercel 会显示需要配置的 DNS 记录。
3. 在 `qiyuan.icu` 的 DNS 服务商处，将该主机指向 Vercel：

   | 类型    | 名称    | 记录值                 |
   | ------- | ------- | ---------------------- |
   | `CNAME` | `linux` | `cname.vercel-dns.com` |

   （若服务商更偏好 A 记录，也可使用 `76.76.21.21`。）

4. 等待 DNS 生效（通常 < 10 分钟）。SSL 证书会自动签发。

如需绝对链接/元数据指向你的域名与仓库，可在 Vercel 项目环境中设置 `NEXT_PUBLIC_SITE_URL` 与 `NEXT_PUBLIC_REPO_URL`。

---

## 🧑‍🏫 课堂模式（教师）

单人也能使用本实验室，但开启登录后即成为真正的教学工具。将 `NEXT_PUBLIC_AUTH_ENABLED` 设为 `true`（并配置下方环境变量）后，应用将获得：

- **GitHub 登录** —— 学生与教师通过 GitHub OAuth 登录。**第一个登录的人成为教师**，之后登录的均为学生。
- **班级** —— 教师创建班级后会得到一个简短的**邀请码**，学生凭码加入（无需审批）。该邀请码同时也是授权分配机器的「钥匙」。
- **纯课堂制** —— 登录用户只有在属于某个**活跃**班级时才会被分配终端；否则不分配机器（游离用户会看到「加入班级」提示）。
- **教师自定义任务** —— 教师**开堂**时设置一段自由文本**任务**与一个**校验命令**（在学生各自沙盒内执行，退出码 `0` 视为完成）。**没有模拟数据**——任务与判分完全由教师定义；默认班级不携带任何任务，直到教师设置。
- **限时沙盒** —— 班级**时长**决定每位成员沙盒的存活时间。时间到或教师**下课**时，所有成员的沙盒会同步销毁。
- **自动判分 + 完成度** —— 学生点击「提交并校验」，校验命令在其真实沙盒内运行，通过与否被记录；班级页面以**完成度矩阵**呈现，数据来自服务端（换设备不丢失）。
- **按用户的沙盒** —— 登录后，学生的沙盒 id 与其账号绑定，环境可跨设备、跨浏览器跟随（匿名模式仅以 Cookie 绑定沙盒）。

> 未配置这些环境变量时，应用运行在**匿名模式**：每个浏览器获得各自的 Cookie 沙盒，进度存于 `localStorage`。功能不受影响——只是没有身份、班级与教师视图。

### 启用步骤

1. 创建 **GitHub OAuth App**（GitHub → Settings → Developer settings → OAuth Apps → New OAuth App）。
   - **Homepage URL：** `https://<你的域名>`（如 `https://linux.qiyuan.icu`）
   - **Authorization callback URL：** `https://<你的域名>/api/auth/callback/github`
   - 复制 **Client ID** 并生成 **Client Secret**。
2. 创建 **Neon Postgres** 数据库（免费额度），复制连接串（建议使用带 `*-pooler*` 的连接池端点）。
3. 在 Vercel 控制台设置以下环境变量（或将 `.env.example` 复制为 `.env.local` 填写）：

   | 变量                       | 必填 | 说明                                |
   | -------------------------- | ---- | ----------------------------------- |
   | `NEXT_PUBLIC_AUTH_ENABLED`  | 是   | 设为 `true` 开启登录与课堂功能。     |
   | `AUTH_SECRET`              | 是   | `openssl rand -base64 32`           |
   | `GITHUB_CLIENT_ID`         | 是   | 来自 GitHub OAuth App               |
   | `GITHUB_CLIENT_SECRET`     | 是   | 来自 GitHub OAuth App               |
   | `DATABASE_URL`             | 是   | Neon Postgres 连接串                |

4. 重新部署。表结构（`users`、`userSandbox`、`userProgress`、`classes`、`classMembers`、`classSubmissions`）会在首次请求时自动创建——`ensureSchema()` 是幂等的。

> Vercel Sandbox SDK 仍会自动读取项目 OIDC Token，课堂模式无需额外沙盒相关环境变量。

---

## 📚 课程一览

| 关卡 | 主题         | 课程内容                                       |
| ---- | ------------ | ---------------------------------------------- |
| 1    | 目录导航     | 创建目录 · 用 `cd` 切换 · 列出隐藏文件         |
| 2    | 文件与内容   | 创建/查看 · 复制 · 移动与删除                  |
| 3    | 权限管理     | 让脚本可执行（`chmod +x`）                     |
| 4    | 文本处理     | 用 `grep` 过滤 · 用 `wc` 计数                  |
| 5    | 管道与重定向 | 用管道统计匹配数                              |
| 6    | 归档压缩     | 用 `tar -czf` 打包目录                        |
| 7    | Shell 基础   | 编写 `for` 循环脚本                           |

每关包含初始化命令（“初始化环境”时执行）与校验命令（“校验”时执行），仅当任务完成时校验命令退出码为 0。校验在**学生自己的沙盒内**运行，因此检验的是真实文件系统状态。

---

## 🗂️ 项目结构

```text
app/
  api/
    auth/[...nextauth]/route.ts   # Auth.js（GitHub OAuth）处理器
    session/route.ts              # 创建/恢复/重置沙盒（Cookie 或 DB）
    exec/route.ts                 # 通过沙盒流式执行命令
    complete/route.ts             # 借 bash compgen 做 Tab 补全
    progress/route.ts             # GET/POST 服务端关卡进度
    lesson/start/route.ts         # 执行某关卡的初始化命令
    lesson/verify/route.ts        # 执行某关卡的校验命令
    classes/route.ts              # 教师：创建班级（含时长）；GET 我的班级
    classes/join/route.ts         # 学生：凭邀请码加入
    classes/[id]/route.ts         # 班级详情 + 教师动作（开堂/下课/设置任务）
    classes/[id]/submit/route.ts  # 学生：执行校验命令并自动判分
  teacher/page.tsx                # 创建 / 加入 / 列出班级
  class/[id]/page.tsx             # 任务设置、开堂/下课、完成度矩阵
  layout.tsx, page.tsx, globals.css
auth.ts                           # Auth.js 配置（GitHub、JWT 会话、首登者为教师）
components/
  Terminal.tsx                    # xterm.js 终端 + 行编辑器 + 历史
  LessonPanel.tsx                 # 双语课程列表、提示、答案、校验
  Header.tsx, AuthButton.tsx      # 页头 + GitHub 登录 / 教师导航
  LangProvider.tsx
db/
  schema.ts                       # Drizzle 表（用户、沙盒、进度、班级…）
  index.ts                        # neon() HTTP 客户端；缺 DATABASE_URL 时 db 为 null
  ensure.ts                       # 幂等的 CREATE TABLE IF NOT EXISTS
lib/
  sandbox.ts                      # Vercel Sandbox 生命周期 + 流式执行
  identity.ts                     # 解析用户 id；从 DB 或 Cookie 读写沙盒
  lessons.ts                      # 双语课程内容（初始化/校验/提示）
  i18n.ts                         # 界面文案字典（英文为主，中文为辅）
  path-util.ts                    # 客户端安全的 cwd / `cd` 解析器（共享）
  cookies.ts                      # 会话 Cookie 名称与选项
types/next-auth.d.ts              # 为 Session 扩展 userId / role
```

界面为双语：`lib/i18n.ts` 存放界面文案（英文为主），`lib/lessons.ts` 存放双语课程内容。通过页头 **EN / 中文** 开关切换。

---

## 🤝 贡献

欢迎贡献！可在 `lib/lessons.ts` 中添加关卡（请同时提供 `en` 与 `zh` 文案），或改进终端与交互。请提交 Issue 或 PR。

---

## 📄 许可证

[MIT](./LICENSE) © 2026 violet27chen

基于 MIT 协议发布 —— 可自由用于个人与商业用途、修改与再分发。
