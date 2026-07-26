"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TerminalWindow, BookOpenText, GithubLogo } from "@phosphor-icons/react";
import LessonPanel from "@/components/LessonPanel";
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

export default function Page() {
  const { t } = useLang();
  const [status, setStatus] = useState<SessionStatus>("connecting");

  const statusLabel =
    status === "ready"
      ? t("statusReady")
      : status === "error"
        ? t("statusError")
        : t("statusConnecting");

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
          <span className={`session-status ${status}`}>
            <span className="status-dot" aria-hidden />
            {statusLabel}
          </span>
        </div>
        <Terminal onStatus={setStatus} />
      </section>

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
    </div>
  );
}
