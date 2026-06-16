import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/components/auth-context";
import { claimFirstAdmin, getCurrentUserAccess } from "@/lib/api/platform.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "管理后台 · 女性友好体验测评" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const claim = useServerFn(claimFirstAdmin);
  const getAccess = useServerFn(getCurrentUserAccess);
  const { ready, user, isAdmin } = useAuth();
  const [state, setState] = useState<"loading" | "anon" | "user" | "admin">("loading");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!ready) return;
      if (!user) {
        if (!cancelled) setState("anon");
        return;
      }
      if (isAdmin) {
        if (!cancelled) setState("admin");
        return;
      }
      try {
        const access = await getAccess({});
        if (!cancelled) setState(access.isAdmin ? "admin" : "user");
      } catch {
        if (!cancelled) setState("user");
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [ready, user, isAdmin, getAccess]);

  if (state === "loading")
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">加载中…</div>
      </SiteLayout>
    );
  if (state === "anon")
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center">
          <h1 className="font-serif text-3xl">需要登录</h1>
          <Link
            to="/login"
            search={{ redirect: "/admin" }}
            className="mt-6 inline-block border border-foreground px-5 py-2.5 text-sm hover:bg-foreground hover:text-background"
          >
            前往登录
          </Link>
        </div>
      </SiteLayout>
    );
  if (state === "user")
    return (
      <SiteLayout>
        <div className="container-prose max-w-xl py-20">
          <h1 className="font-serif text-3xl">非管理员账户</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            如果你是平台首位用户，可以自助声明为初始管理员（仅在系统尚无管理员时可用）。
          </p>
          <button
            onClick={async () => {
              try {
                await claim({});
                toast.success("已成为管理员");
                setState("admin");
                router.invalidate();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            className="mt-6 border border-foreground bg-foreground px-5 py-2.5 text-sm text-background hover:bg-accent"
          >
            声明为初始管理员
          </button>
        </div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <div className="border-b border-border bg-card">
        <div className="container-prose flex items-center gap-1 overflow-x-auto py-3 text-sm">
          <span className="mr-4 font-serif text-base">管理后台</span>
          {[
            { to: "/admin", label: "概览" },
            { to: "/admin/analytics", label: "数据" },
            { to: "/admin/temperature", label: "温度中心" },
            { to: "/admin/knowledge", label: "知识引擎" },
            { to: "/admin/objects", label: "对象" },
            { to: "/admin/observations", label: "观察审核" },
            { to: "/admin/comments", label: "留言" },
            { to: "/admin/feedback", label: "建议" },
            { to: "/admin/bulk-import", label: "批量导入" },
            { to: "/admin/requests", label: "对象申请" },
            { to: "/admin/users", label: "用户信誉" },
            { to: "/admin/audit", label: "审计日志" },
            { to: "/admin/publish", label: "发布校验" },
          ].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/admin" }}
              activeProps={{ className: "border border-foreground text-foreground" }}
              className="rounded-sm px-3 py-1.5 text-muted-foreground hover:text-foreground"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <Outlet />
    </SiteLayout>
  );
}
