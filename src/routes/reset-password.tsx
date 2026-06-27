import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { toast } from "sonner";
import { useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "重置密码 · 女性友好体验测评" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  usePageMeta("seo.reset.title");
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash; the SDK auto-parses on load.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const isRecovery = hash.includes("type=recovery");
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setHasRecovery(true);
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (isRecovery || data.session) setHasRecovery(true);
      setReady(true);
    })();
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("reset.passwordMin"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset.passwordMismatch"));
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("reset.updated"));
      await supabase.auth.signOut();
      navigate({ to: "/login", replace: true });
    } catch (err: any) {
      setError(err?.message || t("reset.updateFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container-prose max-w-md py-20">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("reset.eyebrow")}
        </div>
        <h1 className="mt-3 font-serif text-4xl">{t("reset.title")}</h1>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !hasRecovery ? (
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>{t("reset.invalidTitle")}</p>
            <p>{t("reset.invalidBody")}</p>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="border border-foreground px-4 py-2 text-sm text-foreground hover:bg-accent"
            >
              {t("reset.backLogin")}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            {error && (
              <div className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <input
              type="password"
              required
              placeholder={t("reset.newPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
            <input
              type="password"
              required
              placeholder={t("reset.confirmPassword")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
            <button
              disabled={pending}
              className="w-full border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50"
            >
              {pending ? t("login.processing") : t("reset.update")}
            </button>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
