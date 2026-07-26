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

  function writePrompt() {
    termRef.current?.write("\n" + promptStr() + " ");
  }

  function replaceLine(cmd: string) {
    const term = termRef.current;
    if (!term) return;
    for (let i = 0; i < lineRef.current.length; i++) term.write("\b \b");
    lineRef.current = cmd;
    term.write(cmd);
  }

  function historyPrev() {
    const h = historyRef.current;
    if (h.length === 0) return;
    if (histIdxRef.current > 0) histIdxRef.current--;
    replaceLine(h[histIdxRef.current] ?? "");
  }

  function historyNext() {
    const h = historyRef.current;
    if (histIdxRef.current < h.length - 1) {
      histIdxRef.current++;
      replaceLine(h[histIdxRef.current]);
    } else {
      histIdxRef.current = h.length;
      replaceLine("");
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
      writePrompt();
    }
  }

  function submit() {
    const term = termRef.current;
    if (!term) return;
    const cmd = lineRef.current;
    term.write("\n");
    lineRef.current = "";
    if (cmd.trim() === "") {
      writePrompt();
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

  function handleData(data: string) {
    if (executingRef.current) return;
    if (data === "\u001b[A") return historyPrev();
    if (data === "\u001b[B") return historyNext();
    if (data.startsWith("\u001b")) return; // ignore other escape sequences

    const term = termRef.current;
    if (!term) return;

    for (const ch of data) {
      if (ch === "\r" || ch === "\n") {
        submit();
        return;
      }
      if (ch === "\u007f" || ch === "\b") {
        if (lineRef.current.length > 0) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write("\b \b");
        }
        continue;
      }
      if (ch === "\u0003") {
        term.write("^C");
        lineRef.current = "";
        writePrompt();
        continue;
      }
      if (ch === "\u000c") {
        term.clear();
        writePrompt();
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code >= 32) {
        lineRef.current += ch;
        term.write(ch);
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
        writePrompt();
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
