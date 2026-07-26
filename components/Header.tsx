"use client";

import { TerminalWindow, GithubLogo } from "@phosphor-icons/react";
import { useLang } from "@/components/LangProvider";

const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ||
  "https://github.com/violet27chen/Linux-Practice-Lab";

export default function Header() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <TerminalWindow size={16} weight="bold" />
        </span>
        <span className="brand-name">{t("appTitle")}</span>
        <span className="brand-sub">{t("appSubtitle")}</span>
      </div>
      <div className="header-right">
        <div className="lang-switch" role="group" aria-label={t("language")}>
          <button
            className={lang === "en" ? "active" : ""}
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
          >
            EN
          </button>
          <button
            className={lang === "zh" ? "active" : ""}
            onClick={() => setLang("zh")}
            aria-pressed={lang === "zh"}
          >
            中文
          </button>
        </div>
        <a
          className="icon-link"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t("repoLink")}
        >
          <GithubLogo size={18} weight="bold" />
        </a>
      </div>
    </header>
  );
}
