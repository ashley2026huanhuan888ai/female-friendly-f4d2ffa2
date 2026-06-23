import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { setRemember, consumeExpiredNotice } from "@/lib/remember-login";
import { useI18n, usePageMeta } from "@/lib/i18n";

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
  const { t } = useI18n();
  usePageMeta("seo.login.title");
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const safeRedirect = typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/";
  const { ready, user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  useEffect(() => {
    if (ready && user) navigate({ to: safeRedirect, replace: true });
  }, [ready, user, navigate, safeRedirect]);

  useEffect(() => {
    if (consumeExpiredNotice()) {
      toast.info(t("login.expired"));
    }
  }, [t]);

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
        title: t("login.error.emailNotConfirmed.title") + tag("email_not_confirmed"),
        hint: t("login.error.emailNotConfirmed.hint"),
      };
    }
    if (rawCode === "user_banned" || msg.includes("user is banned") || msg.includes("banned")) {
      return {
        code: "user_banned",
        title: t("login.error.userBanned.title") + tag("user_banned"),
        hint: t("login.error.userBanned.hint"),
      };
    }
    if (rawCode === "user_disabled" || msg.includes("user is disabled")) {
      return {
        code: "user_disabled",
        title: t("login.error.userDisabled.title") + tag("user_disabled"),
        hint: t("login.error.userDisabled.hint"),
      };
    }
    if (rawCode === "signup_disabled" || msg.includes("signups not allowed")) {
      return {
        code: "signup_disabled",
        title: t("login.error.signupDisabled.title") + tag("signup_disabled"),
        hint: t("login.error.signupDisabled.hint"),
      };
    }
    if (rawCode === "invalid_credentials" || msg.includes("invalid login credentials")) {
      return {
        code: "invalid_credentials",
        title: t("login.error.invalidCredentials.title") + tag("invalid_credentials"),
        hint: t("login.error.invalidCredentials.hint"),
      };
    }
    if (rawCode === "user_not_found" || msg.includes("user not found")) {
      return {
        code: "user_not_found",
        title: t("login.error.userNotFound.title") + tag("user_not_found"),
        hint: t("login.error.userNotFound.hint"),
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
        title: t("login.error.rateLimited.title") + tag(rawCode || "rate_limited"),
        hint: t("login.error.rateLimited.hint"),
      };
    }
    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return {
        code: "network_error",
        title: t("login.error.network.title") + tag("network_error"),
        hint: t("login.error.network.hint"),
      };
    }
    if (rawCode === "user_already_exists" || msg.includes("already registered")) {
      return {
        code: "user_already_exists",
        title: t("login.error.alreadyExists.title") + tag("user_already_exists"),
        hint: t("login.error.alreadyExists.hint"),
      };
    }
    if (rawCode === "otp_expired" || msg.includes("token has expired")) {
      return {
        code: "otp_expired",
        title: t("login.error.otpExpired.title") + tag("otp_expired"),
        hint: t("login.error.otpExpired.hint"),
      };
    }
    if (
      rawCode === "otp_invalid" ||
      rawCode === "invalid_otp" ||
      msg.includes("invalid otp") ||
      msg.includes("token is invalid")
    ) {
      return {
        code: "invalid_otp",
        title: t("login.error.invalidOtp.title") + tag("invalid_otp"),
        hint: t("login.error.invalidOtp.hint"),
      };
    }
    if (rawCode === "weak_password") {
      return {
        code: "weak_password",
        title: t("login.error.weakPassword.title") + tag("weak_password"),
        hint: err?.message || t("login.error.weakPassword.hint"),
      };
    }
    return {
      code: rawCode || "unknown",
      title: t("login.error.unknown.title") + tag(rawCode || "unknown"),
      hint: err?.message || t("login.error.unknown.hint"),
    };
  };

  const resendVerification = async () => {
    if (!email.trim()) {
      toast.error(t("login.fillEmail"));
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${safeRedirect}` },
    });
    if (error) toast.error(t("login.resendFailed", { message: error.message }));
    else toast.success(t("login.resendSuccess"));
  };

  const sendPasswordReset = async () => {
    if (!email.trim()) {
      toast.error(t("login.fillEmail"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(t("login.resendFailed", { message: error.message }));
    else toast.success(t("login.resetSuccess"));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);
    if (mode === "signup" && !passwordValid) {
      setErrorDetail({
        title: t("login.error.passwordMin.title"),
        hint: t("login.error.passwordMin.hint"),
      });
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
            title: t("login.error.alreadyExists.title"),
            hint: t("login.error.emailNotConfirmed.hint"),
            code: "user_already_exists",
          });
          return;
        }
        try {
          setRemember(remember);
        } catch {
          /* ignore storage failures */
        }
        toast.success(t("login.signupSuccess"));
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
            title: t("login.error.noSession.title"),
            hint: t("login.error.noSession.hint"),
          });
          return;
        }
        if (!data.user) {
          setErrorDetail({
            title: t("login.error.noUser.title"),
            hint: t("login.error.noUser.hint"),
          });
          return;
        }
        toast.success(t("login.success"));
        try {
          await supabase.auth.getUser();
          await navigate({ to: safeRedirect, replace: true });
        } catch (navErr: any) {
          setErrorDetail({
            title: t("login.error.navFailed.title"),
            hint: t("login.error.navFailed.hint", { path: safeRedirect }),
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
          {mode === "signin" ? t("login.eyebrow.signIn") : t("login.eyebrow.signUp")}
        </div>
        <h1 className="mt-3 font-serif text-4xl">
          {mode === "signin" ? t("login.signIn") : t("login.signUp")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("login.description")}</p>

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
                  {t("login.resend")}
                </button>
              )}
              {(errorDetail.code || errorDetail.status || errorDetail.raw) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">
                    {t("login.errorDetails")}
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
            placeholder={t("login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
          />
          <input
            type="password"
            required
            placeholder={t("login.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
          />
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">{t("login.passwordRule")}</p>
          )}
          <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRememberState(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-foreground"
            />
            <span>{t("login.remember")}</span>
          </label>
          <button
            disabled={pending}
            className="w-full border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50"
          >
            {pending
              ? t("login.processing")
              : mode === "signin"
                ? t("login.signIn")
                : t("login.registerAndSignIn")}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "signin" ? t("login.toSignUp") : t("login.toSignIn")}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={sendPasswordReset}
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("login.forgotPassword")}
            </button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
