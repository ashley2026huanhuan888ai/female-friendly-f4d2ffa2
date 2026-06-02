import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { BackToHome } from "@/components/BackToHome";

const NAV_LINKS = [
  { to: "/feed", label: "观察流" },
  { to: "/objects", label: "全部对象" },
  { to: "/topics", label: "热议议题" },
  { to: "/archive", label: "案例库" },
  { to: "/knowledge", label: "知识引擎" },
  { to: "/about", label: "关于" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setRep] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const [{ data: roles }, { data: prof }, { count }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", data.user.id),
          supabase.from("profiles").select("reputation").eq("id", data.user.id).maybeSingle(),
          supabase.from("notifications" as never).select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id).is("read_at", null),
        ]);
        setIsAdmin(!!roles?.some((r) => r.role === "admin"));
        setRep(prof?.reputation ?? null);
        setUnread(count ?? 0);
      } else {
        setIsAdmin(false); setRep(null); setUnread(0);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

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
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* 右侧账号区（桌面） */}
          <div className="hidden items-center gap-3 text-sm md:flex">
            {isAdmin && (
              <Link to="/admin" className="text-accent hover:text-accent/80">管理后台</Link>
            )}
            {email ? (
              <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
                退出
              </button>
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
            {!email && (
              <Link
                to="/login"
                className="border border-foreground/80 px-2.5 py-1 text-xs text-foreground"
              >
                登录 / 注册
              </Link>
            )}
            {email && (
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
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="border-b border-border/50 py-3 text-foreground"
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
              {email ? (
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
        <div className="container-prose flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-serif text-sm text-foreground">女性友好体验测评</span>
            <span className="ml-3">观察 · 分析 · 不审判</span>
          </div>
          <div>本平台不进行法律意义上的事实认定，不进行道德审判。</div>
        </div>
      </footer>
      <Toaster position="top-center" theme="light" />
    </div>
  );
}
