"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  ArrowRight,
  Users,
  BookOpenText,
  Clock,
} from "@phosphor-icons/react";
import { useLang } from "@/components/LangProvider";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

interface ClassRow {
  id: number;
  name: string;
  code: string;
  role: "teacher" | "member";
  memberCount: number;
  status: string;
  durationMin: number;
}

export default function TeacherPage() {
  const { t } = useLang();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [duration, setDuration] = useState("90");
  const [created, setCreated] = useState<ClassRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch("/api/classes").then((x) => x.json());
    setClasses(r.classes ?? []);
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
          refresh();
        } else {
          setAuthed(false);
        }
      })
      .catch(() => setAuthed(false));
  }, []);

  async function createClass() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          durationMin: Number(duration) || 90,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setCreated({
          id: d.id,
          name: d.name,
          code: d.code,
          role: "teacher",
          memberCount: 0,
          status: "draft",
          durationMin: d.durationMin ?? 90,
        });
        setName("");
        await refresh();
      } else {
        setMsg(d.error ?? "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function joinClass() {
    if (!joinCode.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const d = await r.json();
      if (d.ok) {
        setJoinCode("");
        await refresh();
      } else {
        setMsg(d.error ?? "error");
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
        <div className="panel notice">
          {t("needSignIn")}
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-page">
      <div className="teacher-grid">
        <section className="panel">
          <h2>
            <Plus size={16} weight="bold" /> {t("newClass")}
          </h2>
          <div className="field-row">
            <input
              className="text-input"
              placeholder={t("classNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createClass()}
            />
            <button className="btn primary" onClick={createClass} disabled={busy}>
              {t("create")}
            </button>
          </div>
          <div className="field-row">
            <label className="duration-label" htmlFor="duration">
              <Clock size={13} weight="bold" /> {t("durationMinLabel")}
            </label>
            <input
              id="duration"
              className="text-input duration-input"
              type="number"
              min={1}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          {created && (
            <div className="invite-box">
              <span className="invite-label">{t("shareCodeHint")}</span>
              <div className="invite-code">
                <code>{created.code}</code>
                <button className="btn ghost" onClick={() => copyCode(created.code)}>
                  {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                  {copied ? t("copied") : t("copyCode")}
                </button>
              </div>
              <Link className="btn ghost" href={`/class/${created.id}`}>
                {t("viewClass")} <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          )}
          <h2 style={{ marginTop: 24 }}>
            <LinkIcon size={16} weight="bold" /> {t("joinClass")}
          </h2>
          <div className="field-row">
            <input
              className="text-input"
              placeholder={t("classCodePlaceholder")}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinClass()}
            />
            <button className="btn" onClick={joinClass} disabled={busy}>
              {t("join")}
            </button>
          </div>
          {msg && <p className="setup-note err">{msg}</p>}
        </section>

        <section className="panel">
          <h2>
            <BookOpenText size={16} weight="bold" /> {t("myClasses")}
          </h2>
          {classes.length === 0 ? (
            <p className="lesson-empty">{t("noClassesYet")}</p>
          ) : (
            <ul className="class-list">
              {classes.map((c) => (
                <li key={c.id} className="class-card">
                  <Link href={`/class/${c.id}`} className="class-card-main">
                    <span className="class-name">{c.name}</span>
                    <span className="class-meta">
                      <Users size={13} weight="bold" /> {c.memberCount}
                      <span className={`status-dot-tag status-${c.status}`}>
                        {c.status === "active"
                          ? t("statusActive")
                          : c.status === "ended"
                            ? t("statusEnded")
                            : t("statusDraft")}
                      </span>
                      {c.role === "teacher" ? (
                        <span className="tag teacher">{t("roleTeacher")}</span>
                      ) : (
                        <span className="tag">{t("roleStudent")}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
