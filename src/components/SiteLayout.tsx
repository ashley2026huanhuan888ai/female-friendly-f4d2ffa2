import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { BackToHome } from "@/components/BackToHome";

import { useAuth } from "@/components/auth-context";
import { recordPresence } from "@/lib/api/presence.functions";
import { getCurrentUserAccess } from "@/lib/api/platform.functions";
import { useI18n } from "@/lib/i18n";

const PRESENCE_VISITOR_KEY = "ff_presence_visitor_id";
const PRESENCE_INTERVAL_MS = 90_000;
const PRESENCE_VISITOR_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;

const PRIMARY_NAV = [
  { to: "/objects", labelKey: "nav.objects" },
  { to: "/feed", labelKey: "nav.feed" },
] as const;

const SECONDARY_NAV = [
  { to: "/topics", labelKey: "nav.topics" },
  { to: "/archive/evidence", labelKey: "nav.archive" },
  { to: "/knowledge", labelKey: "nav.knowledge" },
  { to: "/about", labelKey: "nav.about" },
] as const;

const DESK_NAV = [
  { to: "/objects", label: "对象库" },
  { to: "/feed", label: "观察动态" },
  { to: "/knowledge", label: "知识库" },
  { to: "/archive/evidence", label: "提交记录" },
] as const;

function createPresenceVisitorId() {
  const rawId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return `ff_${rawId.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

function getPresenceVisitorId() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PRESENCE_VISITOR_KEY);
    if (stored && PRESENCE_VISITOR_PATTERN.test(stored)) return stored;

    const next = createPresenceVisitorId();
    window.localStorage.setItem(PRESENCE_VISITOR_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function SiteLayout({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "desk";
}) {
  const { ready, user, email, isAdmin, unread, signOut: authSignOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [canSeeAdminNav, setCanSeeAdminNav] = useState(false);
  const { language, setLanguage, t } = useI18n();
  const recordPresenceFn = useServerFn(recordPresence);
  const getAccess = useServerFn(getCurrentUserAccess);

  const router = useRouter();
  const isDeskVariant = variant === "desk";

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [router.state.location.pathname]);

  useEffect(() => {
    const visitorId = getPresenceVisitorId();
    if (!visitorId) return;

    let stopped = false;
    let lastSentAt = 0;
    const sendPresence = () => {
      if (stopped || document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastSentAt < 30_000) return;
      lastSentAt = now;
      void recordPresenceFn({ data: { visitor_id: visitorId } }).catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") sendPresence();
    };

    sendPresence();
    const intervalId = window.setInterval(sendPresence, PRESENCE_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", sendPresence);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", sendPresence);
    };
  }, [recordPresenceFn]);

  useEffect(() => {
    let cancelled = false;

    const checkAdminAccess = async () => {
      if (!ready || !user) {
        setCanSeeAdminNav(false);
        return;
      }
      if (isAdmin) {
        setCanSeeAdminNav(true);
        return;
      }
      try {
        const access = await getAccess({});
        if (!cancelled) setCanSeeAdminNav(access.isAdmin);
      } catch {
        if (!cancelled) setCanSeeAdminNav(false);
      }
    };

    void checkAdminAccess();
    return () => {
      cancelled = true;
    };
  }, [ready, user, isAdmin, getAccess]);

  const signOut = async () => {
    await authSignOut();
    router.invalidate();
  };

  return (
    <div
      className={
        isDeskVariant
          ? "min-h-screen bg-[oklch(0.14_0.012_60)] text-foreground"
          : "min-h-screen bg-background text-foreground"
      }
    >
      <header
        className={
          isDeskVariant
            ? "home-desk-nav absolute left-0 top-0 z-40 w-full border-b border-white/10 bg-black/15 text-paper backdrop-blur-sm"
            : "sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur"
        }
      >
        <div className="container-prose flex h-auto flex-col items-stretch gap-2 py-2 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-0">
          <Link to="/" className="flex min-w-0 items-baseline gap-3 lg:min-w-fit">
            <span className="block whitespace-nowrap font-serif text-xl tracking-tight lg:truncate">
              {isDeskVariant ? "女性友好体验监测站" : t("app.name")}
            </span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:inline">
              {isDeskVariant ? "Female-Friendly Experience Archive" : t("app.brand.en")}
            </span>
          </Link>

          {/* 桌面端主导航 */}
          <nav className="hidden items-center gap-5 text-sm lg:flex">
            {isDeskVariant ? (
              DESK_NAV.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-foreground hover:text-[var(--archive-pink)]"
                >
                  {l.label}
                </Link>
              ))
            ) : (
              <>
                {PRIMARY_NAV.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="whitespace-pre-line text-muted-foreground hover:text-foreground"
                  >
                    {t(l.labelKey)}
                  </Link>
                ))}
                <span className="h-4 w-px bg-border" aria-hidden />
                {SECONDARY_NAV.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t(l.labelKey)}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* 右侧账号区（桌面） */}
          <div className="hidden items-center gap-3 text-sm lg:flex">
            <LanguageToggle language={language} setLanguage={setLanguage} />
            {canSeeAdminNav && (
              <Link to="/admin" className="text-accent hover:text-accent/80">
                {t("nav.admin")}
              </Link>
            )}
            {email ? (
              <>
                <Link to="/me" className="relative text-muted-foreground hover:text-foreground">
                  {t("nav.me")}
                  {unread > 0 && (
                    <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
                <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="border border-foreground/80 px-3 py-1.5 text-foreground hover:bg-foreground hover:text-background"
              >
                {t("nav.loginRegister")}
              </Link>
            )}
          </div>

          {/* 手机/平板：平铺所有导航 + 账号 */}
          <div className="-mx-4 flex items-center gap-3 overflow-x-auto whitespace-nowrap px-4 text-xs lg:hidden">
            {(isDeskVariant
              ? DESK_NAV.map((l) => ({ to: l.to, label: l.label }))
              : [...PRIMARY_NAV, ...SECONDARY_NAV].map((l) => ({ to: l.to, label: t(l.labelKey) }))
            ).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="shrink-0 text-foreground hover:text-[var(--archive-pink)]"
              >
                {l.label}
              </Link>
            ))}
            {canSeeAdminNav && (
              <Link to="/admin" className="shrink-0 text-accent">
                {t("nav.admin")}
              </Link>
            )}
            <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <div className="shrink-0">
              <MobileLanguageButton language={language} setLanguage={setLanguage} />
            </div>
            {email ? (
              <>
                <Link to="/me" className="relative shrink-0 text-muted-foreground">
                  {t("nav.me")}
                  {unread > 0 && (
                    <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
                <button
                  onClick={signOut}
                  className="shrink-0 text-muted-foreground"
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="shrink-0 border border-foreground/80 px-2.5 py-1 text-foreground"
              >
                {t("nav.loginRegister")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {router.state.location.pathname !== "/" && (
        <div className="container-prose py-8">
          <BackToHome />
        </div>
      )}

      <footer className="mt-32 border-t border-border py-12">
        <div className="container-prose space-y-6 text-xs text-muted-foreground">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map((l) => (
              <Link key={l.to} to={l.to} className="whitespace-pre-line hover:text-foreground">
                {t(l.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="font-serif text-sm text-foreground">{t("app.name")}</span>
              <span className="ml-3">{t("app.tagline")}</span>
            </div>
            <div>{t("app.disclaimer")}</div>
          </div>
        </div>
      </footer>
      <Toaster position="top-center" theme="light" />
    </div>
  );
}

function LanguageToggle({
  language,
  setLanguage,
}: {
  language: "zh" | "en";
  setLanguage: (language: "zh" | "en") => void;
}) {
  return (
    <div
      className="inline-flex border border-border text-[11px] uppercase tracking-wider"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLanguage("zh")}
        className={`px-2 py-1 ${language === "zh" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`border-l border-border px-2 py-1 ${language === "en" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        EN
      </button>
    </div>
  );
}

function MobileLanguageButton({
  language,
  setLanguage,
}: {
  language: "zh" | "en";
  setLanguage: (language: "zh" | "en") => void;
}) {
  const nextLanguage = language === "zh" ? "en" : "zh";
  const label = language === "zh" ? "EN" : "中文";
  const actionLabel = language === "zh" ? "切换到 English" : "Switch to 中文";

  return (
    <button
      type="button"
      aria-label={actionLabel}
      title={actionLabel}
      onClick={() => setLanguage(nextLanguage)}
      className="flex h-9 min-w-12 items-center justify-center border border-border px-2 text-[11px] font-medium uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background"
    >
      {label}
    </button>
  );
}
