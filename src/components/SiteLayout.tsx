import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { BackToHome } from "@/components/BackToHome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const PRIMARY_NAV = [
  { to: "/objects", label: "对象" },
  { to: "/feed", label: "观察流" },
  { to: "/request-object", label: "增加\n新测评\n对象" },
] as const;

const SECONDARY_NAV = [
  { to: "/topics", label: "热议议题" },
  { to: "/archive", label: "案例库" },
  { to: "/archive/evidence", label: "证据库" },
  { to: "/knowledge", label: "知识引擎" },
  { to: "/about", label: "关于" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const { ready: authReady, email, isAdmin, unread } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [router.state.location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.invalidate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
        <div className="container-prose flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="font-serif text-xl tracking-tight">女性友好体验测评</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:inline">
              FEMALE EXPERIENCE ASSESSMENT
            </span>
          </Link>

          {/* 桌面端主导航 */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {PRIMARY_NAV.map((l) => (
              <Link key={l.to} to={l.to} className="whitespace-pre-line text-muted-foreground hover:text-foreground">
                {l.label}
              </Link>
            ))}
            <span className="h-4 w-px bg-border" aria-hidden />
            {SECONDARY_NAV.map((l) => (
              <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* 右侧账号区（桌面） */}
          <div className="hidden items-center gap-3 text-sm md:flex">
            {email && (
              <Link to="/admin" className={isAdmin ? "text-accent hover:text-accent/80" : "text-muted-foreground hover:text-foreground"}>
                {isAdmin ? "管理后台" : "管理入口"}
              </Link>
            )}
            {!authReady ? (
              <span className="text-muted-foreground">同步中…</span>
            ) : email ? (
              <>
                <Link to="/me" className="relative text-muted-foreground hover:text-foreground">
                  我的
                  {unread > 0 && (
                    <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
                <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
                  退出
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="border border-foreground/80 px-3 py-1.5 text-foreground hover:bg-foreground hover:text-background"
              >
                登录 / 注册
              </Link>
            )}
          </div>

          {/* 移动端：登录/注册 + 汉堡 */}
          <div className="flex items-center gap-2 md:hidden">
            {!authReady ? null : !email && (
              <Link
                to="/login"
                className="border border-foreground/80 px-2.5 py-1 text-xs text-foreground"
              >
                登录 / 注册
              </Link>
            )}
            {authReady && email && (
              <Link to="/me" className="relative text-xs text-muted-foreground">
                我的
                {unread > 0 && (
                  <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            )}
            <button
              aria-label="菜单"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center border border-border text-foreground"
            >
              <span className="relative block h-3 w-4">
                <span className={`absolute left-0 top-0 h-0.5 w-4 bg-current transition ${menuOpen ? "translate-y-1.5 rotate-45" : ""}`} />
                <span className={`absolute left-0 top-1.5 h-0.5 w-4 bg-current transition ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`absolute left-0 top-3 h-0.5 w-4 bg-current transition ${menuOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
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
                  {l.label}
                </Link>
              ))}
              <div className="border-b border-border/50 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">更多</div>
              {SECONDARY_NAV.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="border-b border-border/50 py-3 pl-3 text-sm text-muted-foreground"
                >
                  {l.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <Link to="/admin" className="border-b border-border/50 py-3 text-accent">
                    管理后台
                  </Link>
                  <Link to="/admin/observations" className="border-b border-border/50 py-3 pl-4 text-sm text-muted-foreground">
                    · 观察审核
                  </Link>
                  <Link to="/admin/requests" className="border-b border-border/50 py-3 pl-4 text-sm text-muted-foreground">
                    · 对象申请审核
                  </Link>
                </>
              )}
              {email && !isAdmin && (
                <Link to="/admin" className="border-b border-border/50 py-3 text-muted-foreground">
                  管理入口
                </Link>
              )}
              {!authReady ? (
                <div className="py-3 text-muted-foreground">同步登录状态中…</div>
              ) : email ? (
                <>
                  <Link to="/me" className="border-b border-border/50 py-3 text-foreground">
                    我的{unread > 0 ? `（${unread > 99 ? "99+" : unread}）` : ""}
                  </Link>
                  <button
                    onClick={signOut}
                    className="py-3 text-left text-muted-foreground"
                  >
                    退出（{email}）
                  </button>
                </>
              ) : (
                <Link to="/login" className="py-3 text-foreground">
                  登录 / 注册
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
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="font-serif text-sm text-foreground">女性友好体验测评</span>
              <span className="ml-3">观察 · 分析 · 不审判</span>
            </div>
            <div>本平台不进行法律意义上的事实认定，不进行道德审判。</div>
          </div>
        </div>
      </footer>
      <Toaster position="top-center" theme="light" />
    </div>
  );
}
