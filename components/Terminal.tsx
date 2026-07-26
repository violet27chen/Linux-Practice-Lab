"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useLang } from "@/components/LangProvider";
import { HOME_DIR, resolveCd, promptCwd } from "@/lib/path-util";

const DEFAULT_CWD = `${HOME_DIR}/practice`;
const EXIT_MARK = "\u0000LP:EXIT=";

export type SessionStatus = "connecting" | "ready" | "error";

export default function Terminal({
  onStatus,
}: {
  onStatus?: (s: SessionStatus) => void;
}) {
  const { t } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  // Input/state kept in refs so the key handler never reads stale closures.
  const cwdRef = useRef(DEFAULT_CWD);
  const prevRef = useRef("");
  const lineRef = useRef("");
  const cursorRef = useRef(0); // caret index within lineRef
  const historyRef = useRef<string[]>([]);
  const histIdxRef = useRef(0);
  const executingRef = useRef(false);

  function promptStr(): string {
    // emerald user@host, zinc-blue cwd, matching the page accent system
    return (
      "\x1b[38;2;52;211;153mstudent@lab\x1b[0m:" +
      `\x1b[38;2;96;165;250m${promptCwd(cwdRef.current)}\x1b[0m$`
    );
  }

  /** Rewrite the current input line in place, leaving the caret positioned. */
  function drawInput() {
    const term = termRef.current;
    if (!term) return;
    term.write("\r\x1b[K" + promptStr() + " " + lineRef.current);
    const back = lineRef.current.length - cursorRef.current;
    if (back > 0) term.write(`\x1b[${back}D`);
  }

  /** Move to a fresh prompt line and draw the (possibly empty) input. */
  function newInputLine() {
    termRef.current?.write("\n" + promptStr());
    drawInput();
  }

  function setLine(cmd: string) {
    lineRef.current = cmd;
    cursorRef.current = cmd.length;
    drawInput();
  }

  function insertChar(ch: string) {
    const before = lineRef.current.slice(0, cursorRef.current);
    const after = lineRef.current.slice(cursorRef.current);
    lineRef.current = before + ch + after;
    cursorRef.current++;
    drawInput();
  }

  function backspace() {
    if (cursorRef.current <= 0) return;
    lineRef.current =
      lineRef.current.slice(0, cursorRef.current - 1) +
      lineRef.current.slice(cursorRef.current);
    cursorRef.current--;
    drawInput();
  }

  function deleteForward() {
    if (cursorRef.current >= lineRef.current.length) return;
    lineRef.current =
      lineRef.current.slice(0, cursorRef.current) +
      lineRef.current.slice(cursorRef.current + 1);
    drawInput();
  }

  function moveCursor(delta: number) {
    cursorRef.current = Math.max(
      0,
      Math.min(lineRef.current.length, cursorRef.current + delta),
    );
    drawInput();
  }

  function moveWord(delta: number) {
    let i = cursorRef.current;
    if (delta > 0) {
      while (i < lineRef.current.length && lineRef.current[i] === " ") i++;
      while (i < lineRef.current.length && lineRef.current[i] !== " ") i++;
    } else {
      while (i > 0 && lineRef.current[i - 1] === " ") i--;
      while (i > 0 && lineRef.current[i - 1] !== " ") i--;
    }
    cursorRef.current = i;
    drawInput();
  }

  function cursorHome() {
    cursorRef.current = 0;
    drawInput();
  }

  function cursorEnd() {
    cursorRef.current = lineRef.current.length;
    drawInput();
  }

  function killToStart() {
    lineRef.current = lineRef.current.slice(cursorRef.current);
    cursorRef.current = 0;
    drawInput();
  }

  function killToEnd() {
    lineRef.current = lineRef.current.slice(0, cursorRef.current);
    drawInput();
  }

  function deleteWordBack() {
    let i = cursorRef.current;
    while (i > 0 && lineRef.current[i - 1] === " ") i--;
    while (i > 0 && lineRef.current[i - 1] !== " ") i--;
    lineRef.current =
      lineRef.current.slice(0, i) + lineRef.current.slice(cursorRef.current);
    cursorRef.current = i;
    drawInput();
  }

  function historyPrev() {
    const h = historyRef.current;
    if (h.length === 0) return;
    if (histIdxRef.current > 0) histIdxRef.current--;
    setLine(h[histIdxRef.current] ?? "");
  }

  function historyNext() {
    const h = historyRef.current;
    if (histIdxRef.current < h.length - 1) {
      histIdxRef.current++;
      setLine(h[histIdxRef.current]);
    } else {
      histIdxRef.current = h.length;
      setLine("");
    }
  }

  function longestCommonPrefix(arr: string[]): string {
    if (arr.length === 0) return "";
    let prefix = arr[0];
    for (const s of arr) {
      let i = 0;
      while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
      prefix = prefix.slice(0, i);
      if (prefix === "") break;
    }
    return prefix;
  }

  /** Tab completion: ask the backend for candidates, then behave like bash. */
  async function complete() {
    const term = termRef.current;
    if (!term || executingRef.current) return;
    const line = lineRef.current;
    const cursor = cursorRef.current;
    try {
      const resp = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line, cursor }),
      });
      if (!resp.ok) {
        term.write("\x07");
        return;
      }
      const data = (await resp.json()) as {
        candidates?: string[];
        isCommand?: boolean;
      };
      const cands = Array.isArray(data.candidates) ? data.candidates : [];
      if (cands.length === 0) {
        term.write("\x07"); // bell
        return;
      }
      const wm = line.slice(0, cursor).match(/(\S*)$/);
      const word = wm ? wm[1] : "";

      const apply = (text: string) => {
        const before = line.slice(0, cursor);
        const after = line.slice(cursor);
        lineRef.current = before + text + after;
        cursorRef.current = before.length + text.length;
        drawInput();
      };

      if (cands.length === 1) {
        let text = cands[0];
        if (data.isCommand) text += " ";
        apply(text.slice(word.length));
        return;
      }
      const common = longestCommonPrefix(cands);
      if (common.length > word.length) {
        apply(common.slice(word.length));
        return;
      }
      // Multiple candidates with no extension — list them, then redraw prompt.
      term.write("\n" + cands.join("   "));
      newInputLine();
    } catch {
      term.write("\x07");
    }
  }

  async function runCommand(cmd: string) {
    const term = termRef.current;
    if (!term) return;
    executingRef.current = true;
    try {
      const resp = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      if (resp.status === 204) {
        // `cd` / empty handled server-side; cwd already updated locally.
        return;
      }
      if (!resp.body) return;
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let exitCode = 0;
      const ingest = (text: string) => {
        pending += text;
        let idx = pending.indexOf(EXIT_MARK);
        while (idx !== -1) {
          term.write(pending.slice(0, idx));
          const end = pending.indexOf("\u0000", idx + EXIT_MARK.length);
          if (end === -1) {
            pending = pending.slice(idx);
            return;
          }
          exitCode =
            parseInt(pending.slice(idx + EXIT_MARK.length, end), 10) || 0;
          pending = pending.slice(end + 1);
          idx = pending.indexOf(EXIT_MARK);
        }
        term.write(pending);
        pending = "";
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) ingest(decoder.decode(value, { stream: true }));
      }
      ingest(decoder.decode());
      if (exitCode === 124) {
        term.write("\n\x1b[33m" + t("timedOut") + "\x1b[0m");
      }
    } catch (e) {
      term.write(
        "\n\x1b[31m" + (e instanceof Error ? e.message : String(e)) + "\x1b[0m",
      );
    } finally {
      executingRef.current = false;
      newInputLine();
    }
  }

  function submit() {
    const term = termRef.current;
    if (!term) return;
    const cmd = lineRef.current;
    term.write("\n");
    lineRef.current = "";
    cursorRef.current = 0;
    if (cmd.trim() === "") {
      newInputLine();
      return;
    }
    historyRef.current.push(cmd);
    histIdxRef.current = historyRef.current.length;
    const cd = resolveCd(cmd, cwdRef.current, prevRef.current || null, HOME_DIR);
    if (cd) {
      cwdRef.current = cd.cwd;
      prevRef.current = cd.prev;
    }
    void runCommand(cmd);
  }

  function ctrlC() {
    termRef.current?.write("^C");
    lineRef.current = "";
    cursorRef.current = 0;
    newInputLine();
  }

  function ctrlL() {
    const term = termRef.current;
    if (!term) return;
    term.clear();
    term.write(promptStr());
    drawInput();
  }

  function handleEscape(data: string) {
    switch (data) {
      case "\u001b[C": // Right
        return moveCursor(1);
      case "\u001b[D": // Left
        return moveCursor(-1);
      case "\u001b[H": // Home
      case "\u001b[1~":
        return cursorHome();
      case "\u001b[F": // End
      case "\u001b[4~":
        return cursorEnd();
      case "\u001b[3~": // Delete (forward)
        return deleteForward();
      case "\u001b[1;5C": // Ctrl+Right
        return moveWord(1);
      case "\u001b[1;5D": // Ctrl+Left
        return moveWord(-1);
      default:
        return;
    }
  }

  function handleData(data: string) {
    if (executingRef.current) return;

    // Arrow history + Tab completion first.
    if (data === "\u001b[A") return historyPrev();
    if (data === "\u001b[B") return historyNext();
    if (data === "\t" || data === "\u001b[Z") {
      void complete();
      return;
    }
    if (data.startsWith("\u001b")) {
      handleEscape(data);
      return;
    }

    for (const ch of data) {
      if (ch === "\r" || ch === "\n") {
        submit();
        return;
      }
      if (ch === "\u007f" || ch === "\b") {
        backspace();
        continue;
      }
      switch (ch) {
        case "\u0003": // Ctrl+C
          ctrlC();
          return;
        case "\u000c": // Ctrl+L
          ctrlL();
          return;
        case "\u0001": // Ctrl+A
          cursorHome();
          continue;
        case "\u0005": // Ctrl+E
          cursorEnd();
          continue;
        case "\u000b": // Ctrl+K
          killToEnd();
          continue;
        case "\u0015": // Ctrl+U
          killToStart();
          continue;
        case "\u0017": // Ctrl+W
          deleteWordBack();
          continue;
      }
      const code = ch.charCodeAt(0);
      if (ch === "\u0004") {
        // Ctrl+D: delete forward char (EOF only matters on an empty line, ignored)
        if (lineRef.current.length > 0) deleteForward();
        continue;
      }
      if (code >= 32) {
        insertChar(ch);
      }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new XTerm({
      convertEol: true,
      cursorBlink: true,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: 13.5,
      lineHeight: 1.35,
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#34d399",
        cursorAccent: "#09090b",
        selectionBackground: "rgba(52, 211, 153, 0.25)",
        black: "#18181b",
        red: "#f87171",
        green: "#34d399",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e4e4e7",
        brightBlack: "#71717a",
        brightRed: "#fca5a5",
        brightGreen: "#6ee7b7",
        brightYellow: "#fcd34d",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#fafafa",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    term.write(t("welcome"));
    term.write("\n\x1b[90m" + t("sandboxStarting") + "\x1b[0m");
    onStatusRef.current?.("connecting");

    const ensureSession = async () => {
      try {
        const resp = await fetch("/api/session", { method: "POST" });
        if (!resp.ok) throw new Error();
        term.write("\n\x1b[32m" + t("sandboxReady") + "\x1b[0m");
        onStatusRef.current?.("ready");
      } catch {
        term.write("\n\x1b[31m" + t("sandboxError") + "\x1b[0m");
        onStatusRef.current?.("error");
      } finally {
        newInputLine();
      }
    };
    void ensureSession();

    const onData = term.onData((d) => handleData(d));

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);
    // refit when the panel itself resizes (grid/viewport changes)
    const ro = new ResizeObserver(onResize);
    ro.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      onData.dispose();
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="xterm-host" />;
}
