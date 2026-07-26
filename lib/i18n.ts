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
  | "passedShort";

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
