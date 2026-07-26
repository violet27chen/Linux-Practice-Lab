"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  BookOpenText,
  Users,
} from "@phosphor-icons/react";
import { useLang } from "@/components/LangProvider";
import { lessons, type Lesson } from "@/lib/lessons";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

interface MemberRow {
  userId: number;
  name: string | null;
  image: string | null;
  done: string[];
}
interface ClassDetail {
  id: number;
  name: string;
  code: string;
  isTeacher: boolean;
  assignments: string[];
  members: MemberRow[];
}

export default function ClassPage() {
  const { t, lang } = useLang();
  const L = (x: { en: string; zh: string }) => x[lang];
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const lessonMap = useMemo(() => {
    const m = new Map<string, Lesson>();
    for (const l of lessons) m.set(l.id, l);
    return m;
  }, []);

  async function load() {
    const r = await fetch(`/api/classes/${id}`).then((x) => x.json());
    if (r.error) {
      setError(r.error);
      setDetail(null);
    } else {
      setDetail(r);
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

  async function assign() {
    if (!pick || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/classes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: pick }),
      });
      const d = await r.json();
      if (d.ok) {
        setDetail((prev) =>
          prev ? { ...prev, assignments: d.assignments } : prev,
        );
        setPick("");
      }
    } finally {
      setBusy(false);
    }
  }

  function copyCode(c: string) {
    navigator.clipboard?.writeText(c).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

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

  return (
    <div className="teacher-page">
      <Link className="back-link" href="/teacher">
        <ArrowLeft size={13} weight="bold" /> {t("backToClasses")}
      </Link>

      <div className="panel class-head">
        <div>
          <h2>{detail.name}</h2>
          <span className="class-code">
            {t("classCode")}: <code>{detail.code}</code>
            <button className="btn ghost" onClick={() => copyCode(detail.code)}>
              {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
              {copied ? t("copied") : t("copyCode")}
            </button>
          </span>
        </div>
        {detail.isTeacher && (
          <div className="assign-row">
            <select
              className="text-input"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="">{t("assignLesson")}…</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {L(l.title)}
                </option>
              ))}
            </select>
            <button className="btn primary" onClick={assign} disabled={busy || !pick}>
              {t("assignLesson")}
            </button>
          </div>
        )}
      </div>

      <section className="panel">
        <h2>
          <Users size={16} weight="bold" /> {t("studentProgress")}
        </h2>
        <div className="progress-scroll">
          <table className="progress-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                {detail.assignments.map((lid) => (
                  <th key={lid} title={lessonMap.get(lid) ? L(lessonMap.get(lid)!.title) : lid}>
                    {lessonMap.get(lid) ? L(lessonMap.get(lid)!.title) : lid}
                  </th>
                ))}
                <th>{t("progress")}</th>
              </tr>
            </thead>
            <tbody>
              {detail.members.length === 0 ? (
                <tr>
                  <td colSpan={detail.assignments.length + 2} className="lesson-empty">
                    {t("noClassesYet")}
                  </td>
                </tr>
              ) : (
                detail.members.map((m) => {
                  const doneCount = detail.assignments.filter((lid) =>
                    m.done.includes(lid),
                  ).length;
                  return (
                    <tr key={m.userId}>
                      <td className="member-name">{m.name ?? `u${m.userId}`}</td>
                      {detail.assignments.map((lid) => (
                        <td key={lid} className="center">
                          {m.done.includes(lid) ? (
                            <Check size={15} weight="bold" className="ok-mark" />
                          ) : (
                            <span className="todo-mark">–</span>
                          )}
                        </td>
                      ))}
                      <td className="center">
                        {doneCount}/{detail.assignments.length}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {detail.assignments.length === 0 && (
          <p className="lesson-empty">
            <BookOpenText size={13} weight="bold" /> {t("assignedLessons")}: —
          </p>
        )}
      </section>
    </div>
  );
}
