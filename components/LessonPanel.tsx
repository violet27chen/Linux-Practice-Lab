"use client";

import { useState } from "react";
import { lessons, type Lesson } from "@/lib/lessons";
import { useLang } from "@/components/LangProvider";

type SetupState = "idle" | "doing" | "done" | "error";
type VerifyResult = { passed: boolean; stdout?: string; stderr?: string };

export default function LessonPanel() {
  const { t, lang } = useLang();
  const L = (x: { en: string; zh: string }) => x[lang];
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [setup, setSetup] = useState<SetupState>("idle");
  const [hintsOpen, setHintsOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

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
          {levels.map((lv) => (
            <div key={lv} className="lesson-group">
              <div className="lesson-group-title">
                {t("level")} {lv} · {L(lessons.find((l) => l.level === lv)!.levelName)}
              </div>
              {lessons
                .filter((l) => l.level === lv)
                .map((l) => (
                  <button
                    key={l.id}
                    className="lesson-item"
                    onClick={() => startLesson(l)}
                  >
                    {L(l.title)}
                  </button>
                ))}
            </div>
          ))}
          <p className="lesson-empty">{t("noLessonSelected")}</p>
        </div>
      ) : (
        <div className="lesson-detail">
          <div className="lesson-detail-head">
            <span className="lesson-level">
              {t("level")} {selected.level} · {L(selected.levelName)}
            </span>
            <button
              className="link-btn"
              onClick={() => {
                setSelected(null);
                setSetup("idle");
                setResult(null);
              }}
            >
              ← {t("lessons")}
            </button>
          </div>
          <h2>{L(selected.title)}</h2>

          <div className="block">
            <div className="block-label">{t("objective")}</div>
            <p className="goal">{L(selected.objective)}</p>
          </div>
          <div className="block">
            <div className="block-label">{t("instructions")}</div>
            <p>{L(selected.instructions)}</p>
          </div>

          <div className="lesson-actions">
            <button
              className="btn"
              onClick={() => startLesson(selected)}
              disabled={setup === "doing"}
            >
              {setup === "done" ? t("resetLesson") : t("startLesson")}
            </button>
            <button
              className="btn primary"
              onClick={verify}
              disabled={verifying}
            >
              {verifying ? t("verifying") : t("verify")}
            </button>
          </div>

          {setup === "done" && <p className="ok-note">{t("lessonStarted")}</p>}
          {setup === "error" && <p className="err-note">{t("sandboxError")}</p>}

          {result && (
            <div className={result.passed ? "verify ok" : "verify fail"}>
              <strong>{result.passed ? t("passed") : t("failed")}</strong>
              {result.stdout ? (
                <pre className="verify-out">{result.stdout}</pre>
              ) : null}
            </div>
          )}

          <div className="hint-block">
            <button
              className="link-btn"
              onClick={() => setHintsOpen((v) => !v)}
            >
              {hintsOpen ? "▾" : "▸"} {t("showHints")}
            </button>
            {hintsOpen && (
              <ul className="hints">
                {selected.hints.map((h, i) => (
                  <li key={i}>
                    <span className="hint-tag">
                      {t("hint")} {i + 1}
                    </span>{" "}
                    {L(h)}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="link-btn"
              onClick={() => setSolutionOpen((v) => !v)}
            >
              {solutionOpen ? "▾" : "▸"} {t("showSolution")}
            </button>
            {solutionOpen && <pre className="solution">{L(selected.solution)}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}
