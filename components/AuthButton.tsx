"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { GithubLogo } from "@phosphor-icons/react";
import { useLang } from "@/components/LangProvider";

const ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

interface SessionView {
  user?: { name?: string; image?: string };
  userId?: number;
  role?: string;
}

export default function AuthButton() {
  const { t } = useLang();
  const [session, setSession] = useState<SessionView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ENABLED) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d as SessionView | null;
        setSession(s && (s.userId || s.user) ? s : null);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  if (!ENABLED) return null;
  if (loading) return <span className="auth-loading" aria-hidden />;

  if (!session) {
    return (
      <button className="btn ghost auth-btn" onClick={() => signIn("github")}>
        <GithubLogo size={15} weight="bold" />
        {t("signIn")}
      </button>
    );
  }

  return (
    <div className="auth-user">
      {session.user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={session.user.image} alt="" className="avatar" />
      ) : (
        <span className="avatar avatar-fallback">
          <GithubLogo size={13} />
        </span>
      )}
      <span className="auth-name">{session.user?.name ?? t("you")}</span>
      {session.role === "teacher" && (
        <a className="btn ghost auth-btn" href="/teacher">
          {t("teacherDashboard")}
        </a>
      )}
      <button className="btn ghost auth-btn" onClick={() => signOut()}>
        {t("signOut")}
      </button>
    </div>
  );
}
