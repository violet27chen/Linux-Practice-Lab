"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  ChalkboardTeacher,
  Play,
  Stop,
  CircleNotch,
  CheckCircle,
  XCircle,
  PencilSimple,
  Clock,
} from "@phosphor-icons/react";
import { useLang } from "@/components/LangProvider";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

interface MemberRow {
  userId: number;
  name: string | null;
  image: string | null;
  done: boolean;
}
interface ClassDetail {
  id: number;
  name: string;
  code: string;
  isTeacher: boolean;
  status: string;
  task: string;
  answerCmd: string;
  durationMin: number;
  startedAt: number | null;
  endsAt: number | null;
  myDone: boolean;
  members: MemberRow[];
}

/** Live "mm:ss" countdown until `endsAt`. */
function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  const left = Math.max(0, Math.floor((endsAt - now) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function ClassPage() {
  const { t } = useLang();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // teacher setup form
  const [taskDraft, setTaskDraft] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [durDraft, setDurDraft] = useState("90");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // student/teacher verify
  const [verifying, setVerifying] = useState(false);
  const [myDone, setMyDone] = useState(false);
  const [result, setResult] = useState<{
    done: boolean;
    stdout?: string;
    stderr?: string;
    message?: string;
  } | null>(null);

  async function load() {
    const r = await fetch(`/api/classes/${id}`).then((x) => x.json());
    if (r.error) {
      setError(r.error);
      setDetail(null);
    } else {
      setDetail(r);
      setMyDone(r.myDone ?? false);
      setError(null);
    }
  }

  useEffect(() => {
    if (!AUTH_ENABLED) {
      setAuthed(false);
      return;
    }
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.userId) {
          setAuthed(true);
          load();
        } else {
          setAuthed(false);
        }
      })
      .catch(() => setAuthed(false));
  }, [id]);

  // Seed the teacher's draft form from the loaded detail.
  useEffect(() => {
    if (!detail) return;
    setTaskDraft(detail.task ?? "");
    setAnswerDraft(detail.answerCmd ?? "");
    setDurDraft(String(detail.durationMin ?? 90));
  }, [detail]);

  async function action(
    body: Record<string, unknown>,
    okMsg?: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/classes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) {
        if (okMsg) setNotice(okMsg);
        await load();
        return true;
      }
      setNotice(d.error ?? "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (verifying || !detail) return;
    setVerifying(true);
    setResult(null);
    try {
      const resp = await fetch(`/api/classes/${id}/submit`, {
        method: "POST",
      });
      const d = await resp.json();
      if (!resp.ok) {
        setResult({ done: false, message: d.message || d.error || t("sandboxError") });
        return;
      }
      setMyDone(d.done);
      setResult({ done: d.done, stdout: d.stdout, stderr: d.stderr });
    } catch {
      setResult({ done: false, message: t("sandboxError") });
    } finally {
      setVerifying(false);
    }
  }

  function copyCode(c: string) {
    navigator.clipboard?.writeText(c).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const countdown = useCountdown(detail?.endsAt ?? null);
  const doneCount = detail
    ? detail.members.filter((m) => m.done).length
    : 0;

  if (!AUTH_ENABLED) {
    return (
      <div className="teacher-page">
        <div className="panel notice">{t("authNotConfigured")}</div>
      </div>
    );
  }
  if (authed === null) return <div className="teacher-page" />;
  if (!authed) {
    return (
      <div className="teacher-page">
        <div className="panel notice">{t("needSignIn")}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="teacher-page">
        <Link className="back-link" href="/teacher">
          <ArrowLeft size={13} weight="bold" /> {t("backToClasses")}
        </Link>
        <div className="panel notice">{error}</div>
      </div>
    );
  }
  if (!detail) return <div className="teacher-page" />;

  const statusBadge =
    detail.status === "active"
      ? t("statusActive")
      : detail.status === "ended"
        ? t("statusEnded")
        : t("statusDraft");

  return (
    <div className="teacher-page">
      <Link className="back-link" href="/teacher">
        <ArrowLeft size={13} weight="bold" /> {t("backToClasses")}
      </Link>

      <div className="panel class-head">
        <div>
          <h2>
            {detail.name}{" "}
            <span className={`status-dot-tag status-${detail.status}`}>
              {statusBadge}
            </span>
          </h2>
          <span className="class-code">
            {t("classCode")}: <code>{detail.code}</code>
            <button className="btn ghost" onClick={() => copyCode(detail.code)}>
              {copied ? (
                <Check size={13} weight="bold" />
              ) : (
                <Copy size={13} weight="bold" />
              )}
              {copied ? t("copied") : t("copyCode")}
            </button>
          </span>
        </div>
        {detail.isTeacher && detail.status === "active" && countdown && (
          <span className="countdown-chip big">
            <Clock size={14} weight="bold" />
            {detail.endsAt !== null && detail.endsAt - Date.now() <= 0
              ? "00:00"
              : countdown}
          </span>
        )}
      </div>

      {/* ---------------- Teacher control panel ---------------- */}
      {detail.isTeacher && (
        <section className="panel">
          <h2>
            <ChalkboardTeacher size={16} weight="bold" /> {t("teacherDashboard")}
          </h2>

          {detail.status === "draft" && (
            <>
              <p className="gate-hint">{t("openConfirm")}</p>
              <div className="setup-form">
                <label className="field-label">
                  {t("taskPrompt")}
                  <textarea
                    className="text-area"
                    rows={5}
                    value={taskDraft}
                    onChange={(e) => setTaskDraft(e.target.value)}
                    placeholder={t("noTaskYet")}
                  />
                </label>
                <label className="field-label">
                  {t("answerCmd")}
                  <textarea
                    className="text-area mono"
                    rows={3}
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    placeholder={"test -f /root/practice/done.txt"}
                  />
                </label>
                <label className="field-label inline">
                  <Clock size={13} weight="bold" /> {t("durationMinLabel")}
                  <input
                    className="text-input duration-input"
                    type="number"
                    min={1}
                    max={1440}
                    value={durDraft}
                    onChange={(e) => setDurDraft(e.target.value)}
                  />
                </label>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() =>
                    action(
                      {
                        action: "open",
                        task: taskDraft,
                        answerCmd: answerDraft,
                        durationMin: Number(durDraft) || 90,
                      },
                      t("classActive"),
                    )
                  }
                >
                  <Play size={14} weight="bold" />
                  {t("openClass")}
                </button>
              </div>
            </>
          )}

          {detail.status === "active" && (
            <>
              <div className="task-readout">
                <div className="block-label">{t("taskPrompt")}</div>
                <pre className="task-text">
                  {detail.task?.trim() ? detail.task : t("noTaskYet")}
                </pre>
                {editing ? (
                  <div className="setup-form">
                    <label className="field-label">
                      {t("taskPrompt")}
                      <textarea
                        className="text-area"
                        rows={5}
                        value={taskDraft}
                        onChange={(e) => setTaskDraft(e.target.value)}
                      />
                    </label>
                    <label className="field-label">
                      {t("answerCmd")}
                      <textarea
                        className="text-area mono"
                        rows={3}
                        value={answerDraft}
                        onChange={(e) => setAnswerDraft(e.target.value)}
                      />
                    </label>
                    <div className="btn-row">
                      <button
                        className="btn primary"
                        disabled={busy}
                        onClick={() =>
                          action(
                            {
                              action: "setTask",
                              task: taskDraft,
                              answerCmd: answerDraft,
                            },
                            t("taskUpdated"),
                          ).then(() => setEditing(false))
                        }
                      >
                        <Check size={14} weight="bold" />
                        {t("saveTask")}
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => {
                          setTaskDraft(detail.task);
                          setAnswerDraft(detail.answerCmd);
                          setEditing(false);
                        }}
                      >
                        {t("backToClasses")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="btn-row">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => setEditing(true)}
                    >
                      <PencilSimple size={14} weight="bold" />
                      {t("setTask")}
                    </button>
                    <button
                      className="btn danger"
                      disabled={busy}
                      onClick={() => action({ action: "close" }, t("classEnded"))}
                    >
                      <Stop size={14} weight="bold" />
                      {t("closeClass")}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {detail.status === "ended" && (
            <>
              <p className="gate-hint">{t("classEnded")}</p>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() =>
                  action(
                    {
                      action: "open",
                      task: detail.task,
                      answerCmd: detail.answerCmd,
                      durationMin: detail.durationMin,
                    },
                    t("classActive"),
                  )
                }
              >
                <Play size={14} weight="bold" />
                {t("reopenClass")}
              </button>
            </>
          )}

          {notice && <p className="setup-note ok">{notice}</p>}
        </section>
      )}

      {/* ---------------- Student task + verify ---------------- */}
      {!detail.isTeacher && (
        <section className="panel">
          <h2>
            <ChalkboardTeacher size={16} weight="bold" /> {t("classTask")}
          </h2>
          {detail.status === "active" ? (
            <>
              <div className="task-body">
                <pre className="task-text">
                  {detail.task?.trim() ? detail.task : t("noTaskYet")}
                </pre>
              </div>
              {myDone ? (
                <p className="setup-note ok">
                  <CheckCircle size={14} weight="bold" /> {t("taskDone")}
                </p>
              ) : null}
              <button
                className="btn primary block"
                onClick={verify}
                disabled={verifying || !detail.task?.trim()}
              >
                {verifying ? (
                  <CircleNotch size={14} weight="bold" className="spin" />
                ) : (
                  <CheckCircle size={14} weight="bold" />
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
            </>
          ) : detail.status === "ended" ? (
            <p className="gate-hint">{t("classEnded")}</p>
          ) : (
            <p className="gate-hint">{t("classNotStarted")}</p>
          )}
        </section>
      )}

      {/* ---------------- Completion matrix (teacher sees everyone) ---------------- */}
      <section className="panel">
        <h2>
          <Users size={16} weight="bold" /> {t("completionLabel")}
          {detail.isTeacher && (
            <span className="count-pill">
              {doneCount}/{detail.members.length}
            </span>
          )}
        </h2>
        {detail.members.length === 0 ? (
          <p className="lesson-empty">{t("noClassesYet")}</p>
        ) : (
          <div className="progress-scroll">
            <table className="progress-table">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th className="center">{t("completionLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.members.map((m) => (
                  <tr key={m.userId}>
                    <td className="member-name">
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" className="avatar sm" />
                      ) : null}
                      {m.name ?? `u${m.userId}`}
                    </td>
                    <td className="center">
                      {m.done ? (
                        <CheckCircle size={15} weight="fill" className="ok-mark" />
                      ) : (
                        <span className="todo-mark">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
