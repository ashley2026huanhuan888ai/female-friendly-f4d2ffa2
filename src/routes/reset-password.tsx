import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "重置密码 · 女性友好体验测评" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
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
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("密码已更新，请使用新密码登录");
      await supabase.auth.signOut();
      navigate({ to: "/login", replace: true });
    } catch (err: any) {
      setError(err?.message || "更新密码失败");
    } finally {
      setPending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container-prose max-w-md py-20">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Reset password
        </div>
        <h1 className="mt-3 font-serif text-4xl">重置密码</h1>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">加载中…</p>
        ) : !hasRecovery ? (
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>未检测到有效的密码重置链接。</p>
            <p>请从邮件中重新打开重置链接，或返回登录页申请新的重置邮件。</p>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="border border-foreground px-4 py-2 text-sm text-foreground hover:bg-accent"
            >
              返回登录
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
              placeholder="新密码（至少 8 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
            <input
              type="password"
              required
              placeholder="再次输入新密码"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
            <button
              disabled={pending}
              className="w-full border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50"
            >
              {pending ? "处理中…" : "更新密码"}
            </button>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
