import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { BackToHome } from "@/components/BackToHome";

import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/lib/i18n";

const PRIMARY_NAV = [
  { to: "/objects", labelKey: "nav.objects" },
  { to: "/feed", labelKey: "nav.feed" },
  { to: "/pricing", labelKey: "nav.pricing" },
] as const;

const SECONDARY_NAV = [
  { to: "/topics", labelKey: "nav.topics" },
  { to: "/archive/evidence", labelKey: "nav.evidence" },
  { to: "/knowledge", labelKey: "nav.knowledge" },
  { to: "/about", labelKey: "nav.about" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const { email, isAdmin, unread, signOut: authSignOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();

  const router = useRouter();

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [router.state.location.pathname]);

  const signOut = async () => {
    await authSignOut();
    router.invalidate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
        <div className="container-prose flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="font-serif text-xl tracking-tight">{t("app.name")}</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:inline">
              {t("app.brand.en")}
            </span>
          </Link>

          {/* 桌面端主导航 */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
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
              <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground">
                {t(l.labelKey)}
              </Link>
            ))}
          </nav>

          {/* 右侧账号区（桌面） */}
          <div className="hidden items-center gap-3 text-sm md:flex">
            <LanguageToggle language={language} setLanguage={setLanguage} />
            {email && (
              <Link
                to="/admin"
                className={
                  isAdmin
                    ? "text-accent hover:text-accent/80"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {isAdmin ? t("nav.admin") : t("nav.adminEntry")}
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

          {/* 移动端：登录/注册 + 汉堡 */}
          <div className="flex items-center gap-2 md:hidden">
            {!email && (
              <Link
                to="/login"
                className="border border-foreground/80 px-2.5 py-1 text-xs text-foreground"
              >
                {t("nav.loginRegister")}
              </Link>
            )}
            {email && (
              <Link to="/me" className="relative text-xs text-muted-foreground">
                {t("nav.me")}
                {unread > 0 && (
                  <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            )}
            <button
              aria-label={t("nav.menu")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center border border-border text-foreground"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-4 bg-current transition ${menuOpen ? "translate-y-1.5 rotate-45" : ""}`}
                />
                <span
                  className={`absolute left-0 top-1.5 h-0.5 w-4 bg-current transition ${menuOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`absolute left-0 top-3 h-0.5 w-4 bg-current transition ${menuOpen ? "-translate-y-1.5 -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* 移动端展开菜单 */}
        {menuOpen && (
          <div className="border-t border-border bg-paper md:hidden">
            <nav className="container-prose flex flex-col py-2 text-sm">
              {PRIMARY_NAV.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="whitespace-pre-line border-b border-border/50 py-3 text-foreground"
                >
                  {t(l.labelKey)}
                </Link>
              ))}
              <div className="border-b border-border/50 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("nav.more")}
              </div>
              {SECONDARY_NAV.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="border-b border-border/50 py-3 pl-3 text-sm text-muted-foreground"
                >
                  {t(l.labelKey)}
                </Link>
              ))}
              <div className="border-b border-border/50 py-3">
                <LanguageToggle language={language} setLanguage={setLanguage} />
              </div>
              {isAdmin && (
                <>
                  <Link to="/admin" className="border-b border-border/50 py-3 text-accent">
                    {t("nav.admin")}
                  </Link>
                  <Link
                    to="/admin/observations"
                    className="border-b border-border/50 py-3 pl-4 text-sm text-muted-foreground"
                  >
                    {t("nav.adminObservations")}
                  </Link>
                  <Link
                    to="/admin/requests"
                    className="border-b border-border/50 py-3 pl-4 text-sm text-muted-foreground"
                  >
                    {t("nav.adminRequests")}
                  </Link>
                </>
              )}
              {email && !isAdmin && (
                <Link to="/admin" className="border-b border-border/50 py-3 text-muted-foreground">
                  {t("nav.adminEntry")}
                </Link>
              )}
              {email ? (
                <>
                  <Link to="/me" className="border-b border-border/50 py-3 text-foreground">
                    {t("nav.me")}
                    {unread > 0 ? ` (${unread > 99 ? "99+" : unread})` : ""}
                  </Link>
                  <button onClick={signOut} className="py-3 text-left text-muted-foreground">
                    {t("nav.signOut")} ({email})
                  </button>
                </>
              ) : (
                <Link to="/login" className="py-3 text-foreground">
                  {t("nav.loginRegister")}
                </Link>
              )}
            </nav>
          </div>
        )}
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
