import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { requestObject } from "@/lib/api/platform.functions";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/request-object")({
  head: () => ({ meta: [{ title: "增加新测评对象 · 女性友好体验测评" }] }),
  component: RequestPage,
});

function RequestPage() {
  const { t, objectType } = useI18n();
  usePageMeta("seo.request.title");
  const navigate = useNavigate();
  const submit = useServerFn(requestObject);
  const { ready, user } = useAuth();
  const [form, setForm] = useState({ requested_name: "", requested_type: "brand", reason: "" });
  const [pending, setPending] = useState(false);

  if (ready && !user) {
    return (
      <LoginPrompt
        title={t("request.loginTitle")}
        body={t("request.loginBody")}
        redirect="/request-object"
      />
    );
  }

  if (!ready)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">
          {t("common.syncingAuth")}
        </div>
      </SiteLayout>
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await submit({
        data: {
          requested_name: form.requested_name,
          requested_type: form.requested_type as any,
          reason: form.reason || undefined,
        },
      });
      toast.success(t("request.success"));
      navigate({ to: "/me" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container-prose max-w-2xl py-16">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("request.eyebrow")}
        </div>
        <h1 className="mt-3 font-serif text-4xl">{t("request.title")}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t("request.body")}</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-6">
          <div>
            <label className="block text-sm font-medium">{t("request.name")}</label>
            <input
              required
              maxLength={120}
              value={form.requested_name}
              onChange={(e) => setForm({ ...form, requested_name: e.target.value })}
              className="mt-2 w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t("request.type")}</label>
            <select
              value={form.requested_type}
              onChange={(e) => setForm({ ...form, requested_type: e.target.value })}
              className="mt-2 w-full border border-border bg-card p-3 text-sm"
            >
              {["brand", "product", "service", "organization", "film", "game", "show", "event"].map(
                (k) => (
                  <option key={k} value={k}>
                    {objectType(k)}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">{t("request.reason")}</label>
            <textarea
              maxLength={500}
              rows={4}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-2 w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
          </div>
          <button
            disabled={pending}
            className="border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50"
          >
            {pending ? t("request.submitting") : t("request.submit")}
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
