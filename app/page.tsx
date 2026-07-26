"use client";

import dynamic from "next/dynamic";
import LessonPanel from "@/components/LessonPanel";
import { useLang } from "@/components/LangProvider";

// xterm.js touches the browser global `self` at module load, which crashes
// server prerendering. Load the terminal client-side only.
const Terminal = dynamic(() => import("@/components/Terminal"), {
  ssr: false,
  loading: () => <div className="xterm-host" />,
});

export default function Page() {
  const { t } = useLang();
  const repoUrl =
    process.env.NEXT_PUBLIC_REPO_URL ||
    "https://github.com/violet27chen/Linux-Practice-Lab";

  return (
    <div className="page">
      <p className="tagline">{t("tagline")}</p>
      <div className="workspace">
        <section className="col card term-col">
          <div className="card-head">{t("terminal")}</div>
          <Terminal />
        </section>
        <aside className="col card lesson-col">
          <div className="card-head">{t("lessons")}</div>
          <LessonPanel />
        </aside>
      </div>
      <footer className="footer">
        <span>{t("footer")}</span>
        <a href={repoUrl} target="_blank" rel="noreferrer">
          {t("repoLink")}
        </a>
      </footer>
    </div>
  );
}
