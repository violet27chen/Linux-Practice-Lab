// Bilingual Linux curriculum. Each lesson is verified by running a shell
// command inside the student's sandbox — it exits 0 when the task is solved.

export type Localized = { en: string; zh: string };

export interface Lesson {
  id: string;
  level: number;
  levelName: Localized;
  title: Localized;
  objective: Localized;
  /** Task description shown in the panel and echoed into the terminal. */
  instructions: Localized;
  /** Shell commands executed once when the student starts the lesson. */
  setup?: string;
  /** A shell command that exits 0 only when the task is correctly done. */
  verify: string;
  hints: Localized[];
  /** Recommended command(s) revealed via "Show solution". */
  solution: Localized;
}

const DATA_FILE_SETUP = `printf '2026-01-01 INFO system started\\n2026-01-02 error disk full\\n2026-01-03 WARN low memory\\n2026-01-04 error network timeout\\n2026-01-05 INFO backup done\\n' > data.txt`;

export const lessons: Lesson[] = [
  // ───────────────────────── Level 1: Navigation ─────────────────────────
  {
    id: "nav-mkdir",
    level: 1,
    levelName: { en: "Navigation", zh: "目录导航" },
    title: { en: "Create a directory", zh: "创建目录" },
    objective: {
      en: "Create a new folder called `projects`.",
      zh: "新建一个名为 `projects` 的文件夹。",
    },
    instructions: {
      en: "Use the `mkdir` command to create a directory named `projects` in the current location.",
      zh: "使用 `mkdir` 命令在当前位置创建一个名为 `projects` 的目录。",
    },
    verify: "test -d projects",
    hints: [
      { en: "mkdir takes the directory name as an argument.", zh: "`mkdir` 后面跟目录名作为参数。" },
      { en: "Try: mkdir projects", zh: "试试：mkdir projects" },
    ],
    solution: { en: "mkdir projects", zh: "mkdir projects" },
  },
  {
    id: "nav-cd",
    level: 1,
    levelName: { en: "Navigation", zh: "目录导航" },
    title: { en: "Move around with cd", zh: "用 cd 切换目录" },
    objective: {
      en: "Enter `projects` and create a file `plan.txt` inside it.",
      zh: "进入 `projects` 目录，并在其中创建一个 `plan.txt` 文件。",
    },
    instructions: {
      en: "Change into the `projects` directory, then create an empty file named `plan.txt` there. (Hint: `cd` changes directory, `touch` creates an empty file.)",
      zh: "切换到 `projects` 目录，然后在里面创建一个空文件 `plan.txt`。（提示：`cd` 切换目录，`touch` 创建空文件。）",
    },
    verify: "test -f projects/plan.txt",
    hints: [
      { en: "cd projects", zh: "cd projects" },
      { en: "touch projects/plan.txt (or cd first, then touch plan.txt)", zh: "touch projects/plan.txt（或先 cd，再 touch plan.txt）" },
    ],
    solution: { en: "cd projects && touch plan.txt", zh: "cd projects && touch plan.txt" },
  },
  {
    id: "nav-ls",
    level: 1,
    levelName: { en: "Navigation", zh: "目录导航" },
    title: { en: "List hidden files", zh: "列出隐藏文件" },
    objective: {
      en: "Create a hidden file `.config` and list it with `ls -a`.",
      zh: "创建一个隐藏文件 `.config`，并用 `ls -a` 把它列出来。",
    },
    instructions: {
      en: "Files starting with a dot are hidden. Create a hidden file named `.config`, then list all files (including hidden ones) with `ls -a`.",
      zh: "以“.”开头的文件是隐藏文件。创建一个名为 `.config` 的隐藏文件，然后用 `ls -a` 列出所有文件（含隐藏文件）。",
    },
    verify: "test -f .config",
    hints: [
      { en: "touch .config", zh: "touch .config" },
      { en: "ls -a shows dotfiles", zh: "`ls -a` 会显示点文件" },
    ],
    solution: { en: "touch .config && ls -a", zh: "touch .config && ls -a" },
  },

  // ───────────────────────── Level 2: Files & content ─────────────────────
  {
    id: "file-create-view",
    level: 2,
    levelName: { en: "Files & content", zh: "文件与内容" },
    title: { en: "Create and view a file", zh: "创建并查看文件" },
    objective: {
      en: "Write the text `hello` into `notes.txt` and view it.",
      zh: "把文本 `hello` 写入 `notes.txt` 并查看它。",
    },
    instructions: {
      en: "Use `echo` with output redirection (`>`) to write `hello` into `notes.txt`, then print its content with `cat`.",
      zh: "用 `echo` 配合输出重定向（`>`）把 `hello` 写入 `notes.txt`，再用 `cat` 打印其内容。",
    },
    verify: 'test "$(cat notes.txt 2>/dev/null)" = "hello"',
    hints: [
      { en: "echo hello > notes.txt", zh: "echo hello > notes.txt" },
      { en: "cat notes.txt", zh: "cat notes.txt" },
    ],
    solution: { en: "echo hello > notes.txt && cat notes.txt", zh: "echo hello > notes.txt && cat notes.txt" },
  },
  {
    id: "file-copy",
    level: 2,
    levelName: { en: "Files & content", zh: "文件与内容" },
    title: { en: "Copy files", zh: "复制文件" },
    objective: {
      en: "Make a backup copy of `notes.txt` named `notes.bak`.",
      zh: "把 `notes.txt` 复制一份，命名为 `notes.bak`。",
    },
    instructions: {
      en: "Use `cp` to copy `notes.txt` to `notes.bak`. (Create `notes.txt` first if it does not exist.)",
      zh: "用 `cp` 把 `notes.txt` 复制为 `notes.bak`。（如果 `notes.txt` 不存在，先创建它。）",
    },
    verify: "test -f notes.bak",
    hints: [
      { en: "cp notes.txt notes.bak", zh: "cp notes.txt notes.bak" },
      { en: "echo hi > notes.txt  # if needed", zh: "echo hi > notes.txt  # 如需要" },
    ],
    solution: { en: "cp notes.txt notes.bak", zh: "cp notes.txt notes.bak" },
  },
  {
    id: "file-move-remove",
    level: 2,
    levelName: { en: "Files & content", zh: "文件与内容" },
    title: { en: "Move and remove", zh: "移动与删除" },
    objective: {
      en: "Move `notes.bak` into a new `archive/` folder, then delete `notes.txt`.",
      zh: "把 `notes.bak` 移动到新建的 `archive/` 文件夹里，然后删除 `notes.txt`。",
    },
    instructions: {
      en: "Create the `archive` directory, move `notes.bak` into it with `mv`, then remove the original `notes.txt` with `rm`.",
      zh: "创建 `archive` 目录，用 `mv` 把 `notes.bak` 移进去，再用 `rm` 删除原来的 `notes.txt`。",
    },
    verify: "test -f archive/notes.bak && [ ! -e notes.txt ]",
    hints: [
      { en: "mkdir archive", zh: "mkdir archive" },
      { en: "mv notes.bak archive/", zh: "mv notes.bak archive/" },
      { en: "rm notes.txt", zh: "rm notes.txt" },
    ],
    solution: {
      en: "mkdir -p archive && mv notes.bak archive/ && rm notes.txt",
      zh: "mkdir -p archive && mv notes.bak archive/ && rm notes.txt",
    },
  },

  // ───────────────────────── Level 3: Permissions ─────────────────────────
  {
    id: "perm-chmod",
    level: 3,
    levelName: { en: "Permissions", zh: "权限管理" },
    title: { en: "Make a script executable", zh: "让脚本可执行" },
    objective: {
      en: "Create `script.sh` and make it executable with `chmod +x`.",
      zh: "创建 `script.sh` 并用 `chmod +x` 赋予可执行权限。",
    },
    instructions: {
      en: "Write `echo hi` into `script.sh`, then use `chmod +x` so it can be run as `./script.sh`.",
      zh: "把 `echo hi` 写入 `script.sh`，然后用 `chmod +x` 让它可以像 `./script.sh` 这样运行。",
    },
    verify: "[ -x script.sh ]",
    hints: [
      { en: "echo 'echo hi' > script.sh", zh: "echo 'echo hi' > script.sh" },
      { en: "chmod +x script.sh", zh: "chmod +x script.sh" },
    ],
    solution: {
      en: "echo 'echo hi' > script.sh && chmod +x script.sh",
      zh: "echo 'echo hi' > script.sh && chmod +x script.sh",
    },
  },

  // ───────────────────────── Level 4: Text processing ─────────────────────
  {
    id: "text-grep",
    level: 4,
    levelName: { en: "Text processing", zh: "文本处理" },
    title: { en: "Filter lines with grep", zh: "用 grep 过滤行" },
    objective: {
      en: "Extract every line containing `error` from `data.txt` into `errors.txt`.",
      zh: "把 `data.txt` 中所有包含 `error` 的行提取到 `errors.txt`。",
    },
    instructions: {
      en: "A file `data.txt` already exists. Use `grep` to copy only the lines that contain the word `error` into a new file `errors.txt`. (Hint: `grep PATTERN FILE > OUT`)",
      zh: "已存在 `data.txt` 文件。用 `grep` 把只包含单词 `error` 的行复制到一个新文件 `errors.txt`。（提示：`grep 模式 文件 > 输出`）",
    },
    setup: DATA_FILE_SETUP,
    verify:
      "test -f errors.txt && grep -q error errors.txt && ! grep -qv error errors.txt",
    hints: [
      { en: "grep error data.txt", zh: "grep error data.txt" },
      { en: "Redirect with > errors.txt", zh: "用 > errors.txt 重定向输出" },
    ],
    solution: {
      en: "grep error data.txt > errors.txt",
      zh: "grep error data.txt > errors.txt",
    },
  },
  {
    id: "text-wc",
    level: 4,
    levelName: { en: "Text processing", zh: "文本处理" },
    title: { en: "Count lines with wc", zh: "用 wc 统计行数" },
    objective: {
      en: "Store the number of lines in `data.txt` into `count.txt`.",
      zh: "把 `data.txt` 的行数存入 `count.txt`。",
    },
    instructions: {
      en: "Use `wc -l` to count lines of `data.txt` and write just the number into `count.txt`. (Hint: `wc -l < data.txt` prints only the number.)",
      zh: "用 `wc -l` 统计 `data.txt` 的行数，并把数字写入 `count.txt`。（提示：`wc -l < data.txt` 只输出数字。）",
    },
    setup: DATA_FILE_SETUP,
    verify:
      'test -f count.txt && test "$(cat count.txt | tr -d " ")" = "$(wc -l < data.txt | tr -d " ")"',
    hints: [
      { en: "wc -l < data.txt", zh: "wc -l < data.txt" },
      { en: "echo \"$(wc -l < data.txt)\" > count.txt", zh: "echo \"$(wc -l < data.txt)\" > count.txt" },
    ],
    solution: {
      en: "wc -l < data.txt > count.txt",
      zh: "wc -l < data.txt > count.txt",
    },
  },

  // ───────────────────────── Level 5: Pipes & redirection ─────────────────
  {
    id: "pipe-count",
    level: 5,
    levelName: { en: "Pipes & redirection", zh: "管道与重定向" },
    title: { en: "Count with a pipe", zh: "用管道计数" },
    objective: {
      en: "Count how many times `error` appears in `data.txt` and save it to `error_count.txt`.",
      zh: "统计 `error` 在 `data.txt` 中出现的次数，并保存到 `error_count.txt`。",
    },
    instructions: {
      en: "Pipe `grep error data.txt` into `wc -l` to count matching lines, then redirect the number into `error_count.txt`.",
      zh: "把 `grep error data.txt` 通过管道传给 `wc -l` 来统计匹配行数，再把数字重定向进 `error_count.txt`。",
    },
    setup: DATA_FILE_SETUP,
    verify:
      'test -f error_count.txt && test "$(cat error_count.txt | tr -d " ")" = "2"',
    hints: [
      { en: "grep error data.txt | wc -l", zh: "grep error data.txt | wc -l" },
      { en: "... > error_count.txt", zh: "... > error_count.txt" },
    ],
    solution: {
      en: "grep error data.txt | wc -l > error_count.txt",
      zh: "grep error data.txt | wc -l > error_count.txt",
    },
  },

  // ───────────────────────── Level 6: Archives ────────────────────────────
  {
    id: "archive-tar",
    level: 6,
    levelName: { en: "Archives", zh: "归档压缩" },
    title: { en: "Archive a directory", zh: "归档目录" },
    objective: {
      en: "Compress the `projects` directory into `backup.tar.gz`.",
      zh: "把 `projects` 目录压缩成 `backup.tar.gz`。",
    },
    instructions: {
      en: "Use `tar` to create a gzip-compressed archive of the `projects` folder named `backup.tar.gz`. (Hint: `tar -czf backup.tar.gz projects`)",
      zh: "用 `tar` 把 `projects` 文件夹打包成 gzip 压缩归档 `backup.tar.gz`。（提示：`tar -czf backup.tar.gz projects`）",
    },
    setup: "mkdir -p projects && echo demo > projects/readme.md",
    verify: "[ -f backup.tar.gz ]",
    hints: [
      { en: "-c create, -z gzip, -f file", zh: "-c 创建, -z gzip, -f 文件" },
      { en: "tar -czf backup.tar.gz projects", zh: "tar -czf backup.tar.gz projects" },
    ],
    solution: {
      en: "tar -czf backup.tar.gz projects",
      zh: "tar -czf backup.tar.gz projects",
    },
  },

  // ───────────────────────── Level 7: Shell basics ────────────────────────
  {
    id: "shell-loop",
    level: 7,
    levelName: { en: "Shell basics", zh: "Shell 基础" },
    title: { en: "A for-loop script", zh: "写一个 for 循环脚本" },
    objective: {
      en: "Write `countdown.sh` that prints `3`, `2`, `1` on separate lines.",
      zh: "编写 `countdown.sh`，逐行输出 `3`、`2`、`1`。",
    },
    instructions: {
      en: "Create a shell script using a `for` loop that prints 3, 2, 1 (each on its own line). Make it executable and test it with `bash countdown.sh`.",
      zh: "用 `for` 循环写一个脚本，逐行打印 3、2、1。用 `bash countdown.sh` 测试。",
    },
    verify:
      'out=$(bash countdown.sh 2>/dev/null); expected=$(printf "3\\n2\\n1"); [ "$out" = "$expected" ]',
    hints: [
      { en: "for i in 3 2 1; do echo $i; done", zh: "for i in 3 2 1; do echo $i; done" },
      { en: "Save with a heredoc or echo, then bash countdown.sh", zh: "用 heredoc 或 echo 保存，再 bash countdown.sh" },
    ],
    solution: {
      en: "printf 'for i in 3 2 1\\ndo\\n  echo $i\\ndone\\n' > countdown.sh && bash countdown.sh",
      zh: "printf 'for i in 3 2 1\\ndo\\n  echo $i\\ndone\\n' > countdown.sh && bash countdown.sh",
    },
  },
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
