import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";
import type { ReactNode } from "react";


export function SiteLayout({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      } else {
        setIsAdmin(false);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.invalidate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
        <div className="container-prose flex h-16 items-center justify-between">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="font-serif text-xl tracking-tight">女性体验温度</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:inline">
              Female Experience Temperature
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex">
            <Link to="/objects" className="text-muted-foreground hover:text-foreground">
              全部对象
            </Link>
            <Link to="/discussions" className="text-muted-foreground hover:text-foreground">
              热门讨论
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              关于
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-accent hover:text-accent/80">
                管理后台
              </Link>
            )}
            {email ? (
              <button
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                退出 · {email.split("@")[0]}
              </button>
            ) : (
              <Link
                to="/login"
                className="border border-foreground/80 px-3 py-1.5 text-foreground hover:bg-foreground hover:text-background"
              >
                登录
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-32 border-t border-border py-12">
        <div className="container-prose flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-serif text-sm text-foreground">女性体验温度</span>
            <span className="ml-3">观察 · 分析 · 不审判</span>
          </div>
          <div>本平台不进行法律意义上的事实认定，不进行道德审判。</div>
        </div>
      </footer>
      <Toaster position="top-center" theme="light" />
    </div>
  );
}

