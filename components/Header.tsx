"use client";

import { useLang } from "@/components/LangProvider";

export default function Header() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="header">
      <div className="brand">
        <span className="logo" aria-hidden>
          🐧
        </span>
        <div className="brand-text">
          <h1>{t("appTitle")}</h1>
          <p>{t("appSubtitle")}</p>
        </div>
      </div>
      <div className="lang">
        <span className="lang-label">{t("language")}</span>
        <div className="lang-switch">
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
      </div>
    </header>
  );
}
