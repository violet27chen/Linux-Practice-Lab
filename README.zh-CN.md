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
    session/route.ts     # 创建/恢复/重置沙盒（Cookie）
    exec/route.ts        # 通过沙盒流式执行命令
    lesson/start.ts      # 执行某关卡的初始化命令
    lesson/verify.ts     # 执行某关卡的校验命令
  layout.tsx, page.tsx, globals.css
components/
  Terminal.tsx           # xterm.js 终端 + 行编辑器 + 历史
  LessonPanel.tsx        # 双语课程列表、提示、答案、校验
  Header.tsx, LangProvider.tsx
lib/
  sandbox.ts             # Vercel Sandbox 生命周期 + 流式执行
  lessons.ts             # 双语课程内容（初始化/校验/提示）
  i18n.ts                # 界面文案字典（英文为主，中文为辅）
  path-util.ts           # 客户端安全的 cwd / `cd` 解析器（共享）
  cookies.ts             # 会话 Cookie 名称与选项
```

界面为双语：`lib/i18n.ts` 存放界面文案（英文为主），`lib/lessons.ts` 存放双语课程内容。通过页头 **EN / 中文** 开关切换。

---

## 🤝 贡献

欢迎贡献！可在 `lib/lessons.ts` 中添加关卡（请同时提供 `en` 与 `zh` 文案），或改进终端与交互。请提交 Issue 或 PR。

---

## 📄 许可证

[MIT](./LICENSE) © 2026 qiyuan

基于 MIT 协议发布 —— 可自由用于个人与商业用途、修改与再分发。
