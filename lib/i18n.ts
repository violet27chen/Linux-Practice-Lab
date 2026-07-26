// Bilingual UI strings. English is the primary language; Chinese is secondary.
// The active language is chosen by the user and persisted in localStorage.

export type Lang = "en" | "zh";
export const LANGS: Lang[] = ["en", "zh"];
export const DEFAULT_LANG: Lang = "en";

export type UIKey =
  | "appTitle"
  | "appSubtitle"
  | "tagline"
  | "language"
  | "english"
  | "chinese"
  | "terminal"
  | "lessons"
  | "startLesson"
  | "verify"
  | "resetLesson"
  | "verifyResult"
  | "passed"
  | "failed"
  | "hint"
  | "showHints"
  | "showSolution"
  | "solution"
  | "noLessonSelected"
  | "lessonStarted"
  | "verifying"
  | "status"
  | "sandboxReady"
  | "sandboxStarting"
  | "sandboxError"
  | "welcome"
  | "hintPrefix"
  | "exitCodeLabel"
  | "timedOut"
  | "emptyCommand"
  | "newSession"
  | "sessionRestarted"
  | "footer"
  | "repoLink"
  | "level"
  | "objective"
  | "instructions"
  | "runHint"
  | "loading"
  | "statusConnecting"
  | "statusReady"
  | "statusError"
  | "progressLabel"
  | "passedShort"
  | "signIn"
  | "signOut"
  | "teacherDashboard"
  | "myClasses"
  | "newClass"
  | "joinClass"
  | "classNamePlaceholder"
  | "classCodePlaceholder"
  | "join"
  | "create"
  | "membersLabel"
  | "assignmentsLabel"
  | "copyCode"
  | "copied"
  | "noClassesYet"
  | "authNotConfigured"
  | "viewClass"
  | "assignedLessons"
  | "studentProgress"
  | "backToClasses"
  | "roleTeacher"
  | "roleStudent"
  | "needSignIn"
  | "classCode"
  | "shareCodeHint"
  | "assignLesson"
  | "assigned"
  | "notAssigned"
  | "lesson"
  | "name"
  | "progress"
  | "you";

export const ui: Record<UIKey, { en: string; zh: string }> = {
  appTitle: {
    en: "Linux Practice Lab",
    zh: "Linux 练习实验室",
  },
  appSubtitle: {
    en: "Learn Linux by doing, in a real shell in your browser",
    zh: "在浏览器里用真终端学 Linux",
  },
  tagline: {
    en: "Every session runs inside an isolated Linux microVM via Vercel Sandbox. No install, no VM setup — just type.",
    zh: "每次练习都在 Vercel Sandbox 提供的隔离 Linux 微虚拟机中运行，无需安装、无需配置虚拟机，直接开敲。",
  },
  language: { en: "Language", zh: "语言" },
  english: { en: "English", zh: "英文" },
  chinese: { en: "中文", zh: "中文" },
  terminal: { en: "Terminal", zh: "终端" },
  lessons: { en: "Lessons", zh: "课程" },
  startLesson: { en: "Set up environment", zh: "初始化环境" },
  verify: { en: "Verify", zh: "校验" },
  resetLesson: { en: "Reset lesson", zh: "重置关卡" },
  verifyResult: { en: "Result", zh: "结果" },
  passed: { en: "Solved! Well done.", zh: "通过了！做得好。" },
  failed: {
    en: "Not there yet. Check the task and try again.",
    zh: "还没完成，再看看任务要求重试一次。",
  },
  hint: { en: "Hint", zh: "提示" },
  showHints: { en: "Show hints", zh: "显示提示" },
  showSolution: { en: "Show solution", zh: "显示答案" },
  solution: { en: "Suggested solution", zh: "推荐命令" },
  noLessonSelected: {
    en: "Pick a lesson on the right, or just explore the terminal freely.",
    zh: "在右侧选择一个课程，或直接在终端里自由探索。",
  },
  lessonStarted: {
    en: "Environment is ready. Follow the instructions in the terminal.",
    zh: "环境已就绪，按终端里的说明操作即可。",
  },
  verifying: { en: "Verifying…", zh: "校验中……" },
  status: { en: "Session", zh: "会话" },
  sandboxReady: { en: "Sandbox ready", zh: "沙盒就绪" },
  sandboxStarting: { en: "Starting your Linux sandbox…", zh: "正在启动你的 Linux 沙盒……" },
  sandboxError: {
    en: "Could not start the sandbox. Please retry or check deployment credentials.",
    zh: "无法启动沙盒，请重试或检查部署凭证。",
  },
  welcome: {
    en: "Welcome! Type Linux commands and press Enter. Try `ls`, `pwd`, or pick a lesson.",
    zh: "欢迎！输入 Linux 命令后回车。试试 `ls`、`pwd`，或选一个课程。",
  },
  hintPrefix: { en: "Hint", zh: "提示" },
  exitCodeLabel: { en: "exit", zh: "退出码" },
  timedOut: {
    en: "Command timed out after 60s (killed). Avoid long-running / interactive programs.",
    zh: "命令在 60 秒后超时（已被终止）。请避免运行长时间或交互式程序。",
  },
  emptyCommand: { en: "(empty)", zh: "（空命令）" },
  newSession: { en: "New sandbox", zh: "新建沙盒" },
  sessionRestarted: { en: "A fresh sandbox has been started.", zh: "已启动一个全新的沙盒。" },
  footer: {
    en: "MIT License · Next.js + Vercel Sandbox",
    zh: "MIT 开源 · Next.js + Vercel Sandbox",
  },
  repoLink: { en: "View source on GitHub", zh: "在 GitHub 查看源码" },
  statusConnecting: { en: "connecting", zh: "连接中" },
  statusReady: { en: "ready", zh: "就绪" },
  statusError: { en: "error", zh: "错误" },
  progressLabel: { en: "completed", zh: "已完成" },
  passedShort: { en: "Passed", zh: "已通过" },
  signIn: { en: "Sign in", zh: "登录" },
  signOut: { en: "Sign out", zh: "退出" },
  teacherDashboard: { en: "Classes", zh: "班级" },
  myClasses: { en: "My classes", zh: "我的班级" },
  newClass: { en: "New class", zh: "新建班级" },
  joinClass: { en: "Join a class", zh: "加入班级" },
  classNamePlaceholder: { en: "Class name", zh: "班级名称" },
  classCodePlaceholder: { en: "Class code", zh: "班级邀请码" },
  join: { en: "Join", zh: "加入" },
  create: { en: "Create", zh: "创建" },
  membersLabel: { en: "Students", zh: "学生" },
  assignmentsLabel: { en: "Assigned", zh: "已布置" },
  copyCode: { en: "Copy invite code", zh: "复制邀请码" },
  copied: { en: "Copied", zh: "已复制" },
  noClassesYet: {
    en: "No classes yet. Create one or join with a code.",
    zh: "还没有班级，新建一个或输入邀请码加入。",
  },
  authNotConfigured: {
    en: "Sign-in is not configured on this deployment yet. Set AUTH_SECRET + GitHub OAuth + DATABASE_URL to enable it.",
    zh: "此部署尚未配置登录。请设置 AUTH_SECRET、GitHub OAuth 与 DATABASE_URL 以启用。",
  },
  viewClass: { en: "Open", zh: "打开" },
  assignedLessons: { en: "Assigned lessons", zh: "已布置课程" },
  studentProgress: { en: "Student progress", zh: "学生进度" },
  backToClasses: { en: "Back to classes", zh: "返回班级列表" },
  roleTeacher: { en: "Teacher", zh: "老师" },
  roleStudent: { en: "Student", zh: "学生" },
  needSignIn: {
    en: "Sign in with GitHub to track progress and use classes.",
    zh: "用 GitHub 登录以保存进度并使用班级功能。",
  },
  classCode: { en: "Invite code", zh: "邀请码" },
  shareCodeHint: {
    en: "Share this code with students so they can join.",
    zh: "把这个码发给学生，他们就能加入。",
  },
  assignLesson: { en: "Assign lesson", zh: "布置课程" },
  assigned: { en: "done", zh: "已完成" },
  notAssigned: { en: "todo", zh: "未完成" },
  lesson: { en: "Lesson", zh: "课程" },
  name: { en: "Name", zh: "名称" },
  progress: { en: "Progress", zh: "进度" },
  you: { en: "You", zh: "我" },
  level: { en: "Level", zh: "关卡" },
  objective: { en: "Goal", zh: "目标" },
  instructions: { en: "Instructions", zh: "任务说明" },
  runHint: {
    en: "Tip: type the command in the terminal on the left, then press Verify.",
    zh: "提示：在左侧终端输入命令，然后点“校验”。",
  },
  loading: { en: "Loading…", zh: "加载中……" },
};

export function t(key: UIKey, lang: Lang): string {
  const entry = ui[key];
  return entry?.[lang] ?? entry?.en ?? key;
}
