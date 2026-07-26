"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  CircleNotch,
  PaperPlane,
  ChalkboardTeacher,
} from "@phosphor-icons/react";
import { useLang } from "@/components/LangProvider";

interface SubmitResult {
  done: boolean;
  stdout?: string;
  stderr?: string;
  message?: string;
}

/**
 * Student-facing task panel for the active class. Shows the teacher-authored
 * task text and a single "Submit & verify" button that runs the teacher's
 * `answerCmd` inside the student's own sandbox (exit 0 = solved). No mock data:
 * the result is whatever the real filesystem state produces.
 */
export default function ClassTaskPanel({
  classId,
  initialTask,
  initialDone,
}: {
  classId: number;
  initialTask: string;
  initialDone: boolean;
}) {
  const { t } = useLang();
  const [task] = useState(initialTask);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [done, setDone] = useState(initialDone);

  async function submit() {
    if (verifying || !task?.trim()) return;
    setVerifying(true);
    setResult(null);
    try {
      const resp = await fetch(`/api/classes/${classId}/submit`, {
        method: "POST",
      });
      const d = await resp.json();
      if (!resp.ok) {
        setResult({
          done: false,
          message: d.message || d.error || t("sandboxError"),
        });
        return;
      }
      setDone(d.done);
      setResult({ done: d.done, stdout: d.stdout, stderr: d.stderr });
    } catch {
      setResult({ done: false, message: t("sandboxError") });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="task-panel">
      <div className="block-label">
        <ChalkboardTeacher size={13} weight="bold" /> {t("classTask")}
      </div>

      <div className="task-body">
        {task?.trim() ? (
          <pre className="task-text">{task}</pre>
        ) : (
          <p className="task-empty">{t("noTaskYet")}</p>
        )}
      </div>

      {done ? (
        <p className="setup-note ok">
          <CheckCircle size={14} weight="bold" /> {t("taskDone")}
        </p>
      ) : null}

      <button
        className="btn primary block"
        onClick={submit}
        disabled={verifying || !task?.trim()}
      >
        {verifying ? (
          <CircleNotch size={14} weight="bold" className="spin" />
        ) : (
          <PaperPlane size={14} weight="bold" />
        )}
        {verifying ? t("verifyBusy") : t("verifyTask")}
      </button>

      {result && (
        <div className={result.done ? "verify ok" : "verify fail"}>
          <span className="verify-title">
            {result.done ? (
              <CheckCircle size={16} weight="fill" />
            ) : (
              <XCircle size={16} weight="fill" />
            )}
            {result.done ? t("verifyPassed") : t("verifyWrong")}
          </span>
          {result.stdout ? (
            <pre className="verify-out">{result.stdout}</pre>
          ) : null}
          {result.stderr ? (
            <pre className="verify-out err">{result.stderr}</pre>
          ) : null}
          {result.message && !result.stdout ? (
            <p className="verify-msg">{result.message}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
