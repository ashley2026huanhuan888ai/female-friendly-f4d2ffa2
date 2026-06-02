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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !passwordValid) {
      toast.error("密码不符合规则，请按下方提示设置");
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
        if (data.user) {
          toast.success("登录成功");
          navigate({ to: safeRedirect, replace: true });
        }
      }
    } catch (err: any) {
      toast.error(err.message === "Invalid login credentials" ? "邮箱或密码不正确，请检查密码是否完整。" : err.message);
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
