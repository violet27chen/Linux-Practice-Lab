"use client";

import { useEffect, useState } from "react";
import {
  CaretLeft,
  CaretDown,
  CaretRight,
  CheckCircle,
  XCircle,
  Lightbulb,
  Code,
  Play,
  ArrowCounterClockwise,
  CircleNotch,
} from "@phosphor-icons/react";
import { lessons, type Lesson } from "@/lib/lessons";
import { useLang } from "@/components/LangProvider";

type SetupState = "idle" | "doing" | "done" | "error";
type VerifyResult = { passed: boolean; stdout?: string; stderr?: string };

const DONE_KEY = "lp_done";
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

function loadDone(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DONE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function LessonPanel() {
  const { t, lang } = useLang();
  const L = (x: { en: string; zh: string }) => x[lang];
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [setup, setSetup] = useState<SetupState>("idle");
  const [hintsOpen, setHintsOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [serverMode, setServerMode] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!AUTH_ENABLED) {
        if (!cancelled) {
          setServerMode(false);
          setDone(loadDone());
        }
        return;
      }
      // Logged in? Then progress lives on the server (survives devices/cookie clears).
      try {
        const s = await fetch("/api/auth/session").then((r) =>
          r.ok ? r.json() : null,
        );
        if (s?.userId) {
          const p = await fetch("/api/progress").then((r) =>
            r.ok ? r.json() : null,
          );
          if (!cancelled) {
            setServerMode(true);
            setDone(Array.isArray(p?.done) ? p.done : []);
          }
          return;
        }
      } catch {
        /* fall through to anonymous */
      }
      if (!cancelled) {
        setServerMode(false);
        setDone(loadDone());
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function markDone(id: string) {
    setDone((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      if (!serverMode) {
        try {
          localStorage.setItem(DONE_KEY, JSON.stringify(next));
        } catch {
          /* ignore quota errors */
        }
      }
      return next;
    });
    if (serverMode) {
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: id, done: true }),
      }).catch(() => {
        /* ignore */
      });
    }
  }

  const levels = Array.from(new Set(lessons.map((l) => l.level))).sort(
    (a, b) => a - b,
  );

  async function startLesson(lesson: Lesson) {
    setSelected(lesson);
    setResult(null);
    setHintsOpen(false);
    setSolutionOpen(false);
    setSetup("doing");
    try {
      const resp = await fetch("/api/lesson/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
      setSetup(resp.ok ? "done" : "error");
    } catch {
      setSetup("error");
    }
  }

  async function verify() {
    if (!selected) return;
    setVerifying(true);
    setResult(null);
    try {
      const resp = await fetch("/api/lesson/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: selected.id }),
      });
      const data = await resp.json();
      if (data.passed) markDone(selected.id);
      setResult({
        passed: data.passed,
        stdout: data.stdout,
        stderr: data.stderr,
      });
    } catch {
      setResult({ passed: false });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="lesson-panel">
      {!selected ? (
        <div className="lesson-list">
          <div className="lesson-progress" style={{ marginBottom: 12 }}>
            <span className="done-count">{done.length}</span>
            <span>/ {lessons.length}</span>
            <span>{t("progressLabel")}</span>
          </div>
          {levels.map((lv) => (
            <div key={lv} className="lesson-group">
              <div className="lesson-group-title">
                <span className="lv">
                  {t("level")} {lv}
                </span>
                {L(lessons.find((l) => l.level === lv)!.levelName)}
              </div>
              {lessons
                .filter((l) => l.level === lv)
                .map((l, i) => {
                  const isDone = done.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      className={`lesson-item${isDone ? " is-done" : ""}`}
                      onClick={() => startLesson(l)}
                    >
                      <span className="lesson-idx">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="li-title">{L(l.title)}</span>
                      {isDone && (
                        <span className="li-done" aria-label={t("passedShort")}>
                          <CheckCircle size={15} weight="fill" />
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
          <p className="lesson-empty">{t("noLessonSelected")}</p>
        </div>
      ) : (
        <div className="lesson-detail">
          <button
            className="back-btn"
            onClick={() => {
              setSelected(null);
              setSetup("idle");
              setResult(null);
            }}
          >
            <CaretLeft size={13} weight="bold" />
            {t("lessons")}
          </button>

          <span className="lesson-level-tag">
            {t("level")} {selected.level} · {L(selected.levelName)}
          </span>
          <h2>{L(selected.title)}</h2>

          <div>
            <div className="block-label">{t("objective")}</div>
            <p className="goal">{L(selected.objective)}</p>
          </div>
          <div>
            <div className="block-label">{t("instructions")}</div>
            <p className="instructions">{L(selected.instructions)}</p>
          </div>

          <div className="lesson-actions">
            <button
              className="btn"
              onClick={() => startLesson(selected)}
              disabled={setup === "doing"}
            >
              {setup === "doing" ? (
                <CircleNotch size={14} weight="bold" className="spin" />
              ) : setup === "done" ? (
                <ArrowCounterClockwise size={14} weight="bold" />
              ) : (
                <Play size={14} weight="bold" />
              )}
              {setup === "done" ? t("resetLesson") : t("startLesson")}
            </button>
            <button className="btn primary" onClick={verify} disabled={verifying}>
              {verifying ? (
                <CircleNotch size={14} weight="bold" className="spin" />
              ) : (
                <CheckCircle size={14} weight="bold" />
              )}
              {verifying ? t("verifying") : t("verify")}
            </button>
          </div>

          {setup === "done" && !result && (
            <p className="setup-note ok">
              <CheckCircle size={14} weight="bold" />
              {t("lessonStarted")}
            </p>
          )}
          {setup === "error" && (
            <p className="setup-note err">
              <XCircle size={14} weight="bold" />
              {t("sandboxError")}
            </p>
          )}

          {result && (
            <div className={result.passed ? "verify ok" : "verify fail"}>
              <span className="verify-title">
                {result.passed ? (
                  <CheckCircle size={16} weight="fill" />
                ) : (
                  <XCircle size={16} weight="fill" />
                )}
                {result.passed ? t("passed") : t("failed")}
              </span>
              {result.stdout ? (
                <pre className="verify-out">{result.stdout}</pre>
              ) : null}
            </div>
          )}

          <div className="hint-block">
            <button className="disclosure" onClick={() => setHintsOpen((v) => !v)}>
              {hintsOpen ? (
                <CaretDown size={12} weight="bold" />
              ) : (
                <CaretRight size={12} weight="bold" />
              )}
              <Lightbulb size={14} weight="bold" />
              {t("showHints")}
            </button>
            {hintsOpen && (
              <ul className="hints">
                {selected.hints.map((h, i) => (
                  <li key={i}>{L(h)}</li>
                ))}
              </ul>
            )}
            <button
              className="disclosure"
              onClick={() => setSolutionOpen((v) => !v)}
            >
              {solutionOpen ? (
                <CaretDown size={12} weight="bold" />
              ) : (
                <CaretRight size={12} weight="bold" />
              )}
              <Code size={14} weight="bold" />
              {t("showSolution")}
            </button>
            {solutionOpen && <pre className="solution">{L(selected.solution)}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}
