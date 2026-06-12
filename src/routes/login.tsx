import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { setRemember, consumeExpiredNotice } from "@/lib/remember-login";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "登录 · 女性友好体验测评" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const safeRedirect = typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/";
  const { ready, user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [remember, setRememberState] = useState(true);
  const [errorDetail, setErrorDetail] = useState<null | {
    title: string;
    hint: string;
    code?: string;
    status?: number;
    raw?: string;
    canResend?: boolean;
  }>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: safeRedirect, replace: true });
  }, [ready, user, navigate, safeRedirect]);

  useEffect(() => {
    if (consumeExpiredNotice()) {
      toast.info("登录状态已过期，请重新登录。");
    }
  }, []);

  const PASSWORD_MIN_LENGTH = 8;
  const passwordValid = password.length >= PASSWORD_MIN_LENGTH;

  const explainAuthError = (
    err: any,
  ): { title: string; hint: string; code: string; canResend?: boolean } => {
    const rawCode: string = err?.code || err?.error_code || "";
    const status: number | undefined = err?.status;
    const msg: string = (err?.message || "").toLowerCase();
    const tag = (c: string) => ` [${c}]`;

    if (
      rawCode === "email_not_confirmed" ||
      msg.includes("email not confirmed") ||
      msg.includes("not confirmed")
    ) {
      return {
        code: "email_not_confirmed",
        canResend: true,
        title: "邮箱尚未验证" + tag("email_not_confirmed"),
        hint: "账号已存在但邮箱未完成验证。请到邮箱点击验证链接（含垃圾邮件箱）后再登录，或点击下方重新发送验证邮件。",
      };
    }
    if (rawCode === "user_banned" || msg.includes("user is banned") || msg.includes("banned")) {
      return {
        code: "user_banned",
        title: "账号已被禁用" + tag("user_banned"),
        hint: "该账号被管理员临时或永久禁用，无法登录。请联系管理员解除限制。",
      };
    }
    if (rawCode === "user_disabled" || msg.includes("user is disabled")) {
      return {
        code: "user_disabled",
        title: "账号已停用" + tag("user_disabled"),
        hint: "账号处于停用状态，请联系管理员恢复。",
      };
    }
    if (rawCode === "signup_disabled" || msg.includes("signups not allowed")) {
      return {
        code: "signup_disabled",
        title: "注册功能已关闭" + tag("signup_disabled"),
        hint: "当前不开放注册，请联系管理员。",
      };
    }
    if (rawCode === "invalid_credentials" || msg.includes("invalid login credentials")) {
      return {
        code: "invalid_credentials",
        title: "邮箱或密码不正确" + tag("invalid_credentials"),
        hint: "出于安全策略，服务器不会区分是邮箱不存在还是密码错误。请检查邮箱拼写与密码大小写；如忘记密码请重置。",
      };
    }
    if (rawCode === "user_not_found" || msg.includes("user not found")) {
      return {
        code: "user_not_found",
        title: "账号不存在" + tag("user_not_found"),
        hint: "该邮箱尚未注册，请先切换到注册。",
      };
    }
    if (
      rawCode === "over_request_rate_limit" ||
      rawCode === "over_email_send_rate_limit" ||
      status === 429 ||
      msg.includes("rate limit")
    ) {
      return {
        code: rawCode || "rate_limited",
        title: "尝试过于频繁" + tag(rawCode || "rate_limited"),
        hint: "请稍等 1–2 分钟后再试。",
      };
    }
    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return {
        code: "network_error",
        title: "网络异常" + tag("network_error"),
        hint: "无法连接服务器，请检查网络或稍后重试。",
      };
    }
    if (rawCode === "user_already_exists" || msg.includes("already registered")) {
      return {
        code: "user_already_exists",
        title: "该邮箱已注册" + tag("user_already_exists"),
        hint: "请直接登录，或使用其他邮箱注册。",
      };
    }
    if (rawCode === "weak_password") {
      return {
        code: "weak_password",
        title: "密码不符合要求" + tag("weak_password"),
        hint: err?.message || "请按密码规则设置。",
      };
    }
    return {
      code: rawCode || "unknown",
      title: "登录失败" + tag(rawCode || "unknown"),
      hint: err?.message || "未知错误，请稍后重试。",
    };
  };

  const resendVerification = async () => {
    if (!email.trim()) {
      toast.error("请先填写邮箱");
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${safeRedirect}` },
    });
    if (error) toast.error("发送失败：" + error.message);
    else toast.success("验证邮件已重新发送，请查收");
  };

  const sendPasswordReset = async () => {
    if (!email.trim()) {
      toast.error("请先填写邮箱");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error("发送失败：" + error.message);
    else toast.success("重置邮件已发送，请查收（含垃圾邮件箱）");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);
    if (mode === "signup" && !passwordValid) {
      setErrorDetail({ title: "密码至少需要 8 位", hint: "密码至少 8 位。建议包含字母和数字。" });
      return;
    }
    setPending(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}${safeRedirect}` },
        });
        if (error) throw error;
        // Supabase returns user with empty identities[] when the email is already registered
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setErrorDetail({
            title: "该邮箱可能已注册",
            hint: "如未收到验证邮件，请直接尝试登录，或在登录页点击「重新发送验证邮件」。",
            code: "user_already_exists",
          });
          return;
        }
        try {
          setRemember(remember);
        } catch {
          /* ignore storage failures */
        }
        toast.success("注册成功，请按邮件提示完成验证后登录");
        setMode("signin");
        setPassword("");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        try {
          setRemember(remember);
        } catch {
          /* ignore storage failures */
        }
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
          await supabase.auth.getUser();
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
        code: info.code,
        status: err?.status,
        raw: err?.message,
        canResend: info.canResend,
      });
      toast.error(info.title);
      console.error("[login] auth error:", {
        code: info.code,
        status: err?.status,
        message: err?.message,
        err,
      });
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
              {errorDetail.canResend && (
                <button
                  type="button"
                  onClick={resendVerification}
                  className="mt-2 border border-destructive/40 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  重新发送验证邮件
                </button>
              )}
              {(errorDetail.code || errorDetail.status || errorDetail.raw) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">
                    技术细节（便于定位问题）
                  </summary>
                  <div className="mt-1 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                    {errorDetail.code && <div>error_code: {errorDetail.code}</div>}
                    {errorDetail.status !== undefined && (
                      <div>http_status: {errorDetail.status}</div>
                    )}
                    {errorDetail.raw && <div className="break-all">raw: {errorDetail.raw}</div>}
                  </div>
                </details>
              )}
            </div>
          )}
          <input
            type="email"
            required
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
          />
          <input
            type="password"
            required
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
          />
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">密码至少 8 位。建议包含字母和数字。</p>
          )}
          <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRememberState(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
            <span>保持登录 30 天</span>
          </label>
          <button
            disabled={pending}
            className="w-full border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50"
          >
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
