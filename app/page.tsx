"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import {
  TerminalWindow,
  BookOpenText,
  GithubLogo,
  ChalkboardTeacher,
  Clock,
} from "@phosphor-icons/react";
import LessonPanel from "@/components/LessonPanel";
import ClassTaskPanel from "@/components/ClassTaskPanel";
import { useLang } from "@/components/LangProvider";
import type { SessionStatus } from "@/components/Terminal";

// xterm.js touches the browser global `self` at module load, which crashes
// server prerendering. Load the terminal client-side only.
const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: () => (
    <div className="term-skeleton" aria-hidden>
      <span />
      <span />
      <span />
    </div>
  ),
});

const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ||
  "https://github.com/violet27chen/Linux-Practice-Lab";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

type Gate = "checking" | "login" | "class" | "ok";
type ClassInfo = {
  id: number;
  name: string;
  task: string;
  endsAt: number | null;
  status: string;
  done: boolean;
};

/** Live "mm:ss" / "hh:mm:ss" countdown until `endsAt` (null = no limit). */
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

export default function Page() {
  const { t } = useLang();
  const [status, setStatus] = useState<SessionStatus>("connecting");
  const [gate, setGate] = useState<Gate>(AUTH_ENABLED ? "checking" : "ok");
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Resolve the gate: logged in? in an active class? Sets `gate` + `classInfo`.
  async function checkAccess() {
    const s = await fetch("/api/auth/session").then((r) =>
      r.ok ? r.json() : null,
    );
    if (!s?.userId) {
      setGate("login");
      return;
    }
    const r = await fetch("/api/session", { method: "POST" }).then((r) =>
      r.json(),
    );
    if (r.needLogin) {
      setGate("login");
    } else if (r.needClass) {
      setGate("class");
    } else if (r.ok && r.class) {
      setClassInfo(r.class);
      setGate("ok");
    } else {
      setGate("class");
    }
  }

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    checkAccess();
  }, []);

  // Student enters the teacher's invite code (the key) right on the gate.
  async function joinClass() {
    if (!joinCode.trim() || joinBusy) return;
    setJoinBusy(true);
    setJoinMsg(null);
    try {
      const r = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const d = await r.json();
      if (d.ok) {
        setJoined(true);
        setJoinCode("");
        await checkAccess(); // flips to "ok" if the class is already live
      } else {
        setJoinMsg(
          d.error === "class not found" ? t("invalidCode") : t("needClass"),
        );
      }
    } catch {
      setJoinMsg(t("needClass"));
    } finally {
      setJoinBusy(false);
    }
  }

  const statusLabel =
    status === "ready"
      ? t("statusReady")
      : status === "error"
        ? t("statusError")
        : t("statusConnecting");

  // Anonymous (zero-config) mode: terminal + built-in lessons, unchanged.
  if (!AUTH_ENABLED || gate === "ok") {
    return (
      <div className="workspace">
        <section className="panel term-panel">
          <div className="panel-head">
            <span className="panel-title">
              <span className="p-icon">
                <TerminalWindow size={14} weight="bold" />
              </span>
              bash - vercel sandbox
            </span>
            <span className="head-right">
              {classInfo && (
                <span className="class-chip" title={classInfo.name}>
                  <ChalkboardTeacher size={13} weight="bold" />
                  <span className="chip-name">{classInfo.name}</span>
                  <CountdownChip endsAt={classInfo.endsAt} />
                </span>
              )}
              <span className={`session-status ${status}`}>
                <span className="status-dot" aria-hidden />
                {statusLabel}
              </span>
            </span>
          </div>
          <Terminal onStatus={setStatus} />
        </section>

        {AUTH_ENABLED && classInfo ? (
          <aside className="panel lesson-col">
            <div className="panel-head">
              <span className="panel-title">
                <span className="p-icon">
                  <ChalkboardTeacher size={14} weight="bold" />
                </span>
                {t("classTask")}
              </span>
            </div>
            <ClassTaskPanel
              classId={classInfo.id}
              initialTask={classInfo.task}
              initialDone={classInfo.done}
            />
            <div className="side-footer">
              <span>{t("footer")}</span>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GithubLogo size={13} weight="bold" />
                GitHub
              </a>
            </div>
          </aside>
        ) : (
          <aside className="panel lesson-col">
            <div className="panel-head">
              <span className="panel-title">
                <span className="p-icon">
                  <BookOpenText size={14} weight="bold" />
                </span>
                {t("lessons")}
              </span>
            </div>
            <LessonPanel />
            <div className="side-footer">
              <span>{t("footer")}</span>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                <GithubLogo size={13} weight="bold" />
                GitHub
              </a>
            </div>
          </aside>
        )}
      </div>
    );
  }

  // Gate overlays (auth enabled, not yet cleared).
  if (gate === "login") {
    return (
      <div className="workspace">
        <section className="panel gate-panel">
          <div className="gate-inner">
            <span className="gate-mark">
              <GithubLogo size={26} weight="bold" />
            </span>
            <h2>{t("needLogin")}</h2>
            <p className="gate-hint">{t("gateLoginHint")}</p>
            <button className="btn primary block" onClick={() => signIn("github")}>
              <GithubLogo size={15} weight="bold" />
              {t("signInGitHub")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Logged in but no active class → enter the teacher's key (invite code) here.
  return (
    <div className="workspace">
      <section className="panel gate-panel">
        <div className="gate-inner">
          <span className="gate-mark">
            <ChalkboardTeacher size={26} weight="bold" />
          </span>
          <h2>{t("needClass")}</h2>
          <p className="gate-hint">{t("gateClassHint")}</p>
          <div className="join-box">
            <input
              className="text-input"
              placeholder={t("classCodePlaceholder")}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinClass()}
              disabled={joinBusy}
            />
            <button
              className="btn primary"
              onClick={joinClass}
              disabled={joinBusy || !joinCode.trim()}
            >
              {t("join")}
            </button>
          </div>
          {joined && (
            <p className="setup-note ok">{t("joinedWaiting")}</p>
          )}
          {joinMsg && <p className="gate-foot err">{joinMsg}</p>}
          <p className="gate-foot">{t("rejoinHint")}</p>
        </div>
      </section>
    </div>
  );
}

function CountdownChip({ endsAt }: { endsAt: number | null }) {
  const left = useCountdown(endsAt);
  if (left === null) return null;
  const up = endsAt !== null && endsAt - Date.now() <= 0;
  return (
    <span className={`countdown-chip${up ? " up" : ""}`}>
      <Clock size={12} weight="bold" />
      {up ? "00:00" : left}
    </span>
  );
}
