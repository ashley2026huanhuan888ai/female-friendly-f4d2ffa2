import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/" }),
  head: () => ({ meta: [{ title: "登录 · 女性友好体验测评" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const safeRedirect = typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorDetail, setErrorDetail] = useState<null | {
    title: string;
    hint: string;
    code?: string;
    status?: number;
    raw?: string;
  }>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) navigate({ to: safeRedirect, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: safeRedirect, replace: true });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, safeRedirect]);

  const passwordRules = [
    { ok: password.length >= 8, label: "至少 8 位" },
    { ok: /[a-z]/.test(password), label: "包含小写字母" },
    { ok: /[A-Z]/.test(password), label: "包含大写字母" },
    { ok: /[0-9]/.test(password), label: "包含数字" },
  ];
  const passwordValid = passwordRules.every((r) => r.ok);

  const explainAuthError = (err: any): { title: string; hint: string } => {
    const code: string = err?.code || err?.error_code || "";
    const status: number | undefined = err?.status;
    const msg: string = (err?.message || "").toLowerCase();

    if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
      return { title: "邮箱或密码不正确", hint: "请确认邮箱拼写、密码大小写与完整字符。如忘记密码请重置。" };
    }
    if (code === "email_not_confirmed" || msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return { title: "邮箱尚未验证", hint: "请到邮箱点击验证链接后再登录（含垃圾邮件箱）。" };
    }
    if (code === "user_not_found" || msg.includes("user not found")) {
      return { title: "账号不存在", hint: "该邮箱尚未注册，请先切换到注册。" };
    }
    if (code === "user_banned" || msg.includes("banned") || msg.includes("blocked")) {
      return { title: "账号被限制", hint: "该账号被停用或限制登录，请联系管理员。" };
    }
    if (code === "over_request_rate_limit" || status === 429 || msg.includes("rate limit")) {
      return { title: "尝试过于频繁", hint: "请稍等一两分钟后再试。" };
    }
    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return { title: "网络异常", hint: "无法连接服务器，请检查网络或稍后重试。" };
    }
    if (code === "user_already_exists" || msg.includes("already registered")) {
      return { title: "该邮箱已注册", hint: "请直接登录，或使用其他邮箱注册。" };
    }
    if (code === "weak_password") {
      return { title: "密码不符合要求", hint: err?.message || "请按密码规则设置。" };
    }
    return { title: "登录失败", hint: err?.message || "未知错误，请稍后重试。" };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);
    if (mode === "signup" && !passwordValid) {
      setErrorDetail({ title: "密码不符合规则", hint: "请按下方提示设置密码。" });
      return;
    }
    setPending(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}${safeRedirect}` },
        });
        if (error) throw error;
        toast.success("注册成功，请按邮件提示完成验证后登录");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setErrorDetail({
            title: "登录未建立会话",
            hint: "服务端未返回 session，可能是邮箱未验证或账号被限制。",
          });
          return;
        }
        if (!data.user) {
          setErrorDetail({ title: "登录异常", hint: "未获取到用户信息，请重试。" });
          return;
        }
        toast.success("登录成功，正在跳转…");
        try {
          await navigate({ to: safeRedirect, replace: true });
        } catch (navErr: any) {
          setErrorDetail({
            title: "登录成功但跳转失败",
            hint: `目标路径无效：${safeRedirect}。已保留登录态，可手动前往首页。`,
            raw: navErr?.message,
          });
        }
      }
    } catch (err: any) {
      const info = explainAuthError(err);
      setErrorDetail({
        title: info.title,
        hint: info.hint,
        code: err?.code || err?.error_code,
        status: err?.status,
        raw: err?.message,
      });
      toast.error(info.title);
      console.error("[login] auth error:", { code: err?.code, status: err?.status, message: err?.message, err });
    } finally {
      setPending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container-prose max-w-md py-20">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {mode === "signin" ? "Sign in" : "Sign up"}
        </div>
        <h1 className="mt-3 font-serif text-4xl">{mode === "signin" ? "登录" : "创建账户"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">使用邮箱与密码登录。</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          {errorDetail && (
            <div role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="font-medium text-destructive">{errorDetail.title}</div>
              <div className="mt-1 text-muted-foreground">{errorDetail.hint}</div>
              {(errorDetail.code || errorDetail.status || errorDetail.raw) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">技术细节</summary>
                  <div className="mt-1 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                    {errorDetail.code && <div>code: {errorDetail.code}</div>}
                    {errorDetail.status !== undefined && <div>status: {errorDetail.status}</div>}
                    {errorDetail.raw && <div className="break-all">message: {errorDetail.raw}</div>}
                  </div>
                </details>
              )}
            </div>
          )}
          <input type="email" required placeholder="邮箱"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          <input type="password" required placeholder="密码"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          {mode === "signup" && (
            <ul className="space-y-1 rounded border border-border bg-card/50 p-3 text-xs">
              <li className="mb-1 text-muted-foreground">密码规则：</li>
              {passwordRules.map((r) => (
                <li key={r.label} className={r.ok ? "text-foreground" : "text-muted-foreground"}>
                  {r.ok ? "✓" : "○"} {r.label}
                </li>
              ))}
            </ul>
          )}
          <button disabled={pending} className="w-full border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50">
            {pending ? "处理中…" : mode === "signin" ? "登录" : "注册并登录"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "还没有账户？注册" : "已有账户？登录"}
        </button>
      </div>
    </SiteLayout>
  );
}
