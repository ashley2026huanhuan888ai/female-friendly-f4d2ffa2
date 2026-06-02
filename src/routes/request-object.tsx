import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { requestObject } from "@/lib/api/platform.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { LoginPrompt } from "@/components/LoginPrompt";
import { toast } from "sonner";

export const Route = createFileRoute("/request-object")({
  head: () => ({ meta: [{ title: "我希望评估 · 女性友好体验测评" }] }),
  component: RequestPage,
});

function RequestPage() {
  const navigate = useNavigate();
  const submit = useServerFn(requestObject);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [form, setForm] = useState({ requested_name: "", requested_type: "brand", reason: "" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  if (authed === false) {
    return (
      <LoginPrompt
        title="登录后申请测评对象"
        body="登录后可以提交你希望被测评的品牌、产品、影视作品或服务。"
        redirect="/request-object"
      />
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await submit({ data: { requested_name: form.requested_name, requested_type: form.requested_type as any, reason: form.reason || undefined } });
      toast.success("申请已提交。对象需管理员审核创建后才会出现在首页，可在「我的」页查看进度。");
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
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">提交申请</div>
        <h1 className="mt-3 font-serif text-4xl">我希望评估…</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          用户不能直接创建对象。请填写你希望加入观察的对象，<strong className="text-foreground">由管理员审核后才会出现在平台首页和列表中</strong>。审核通常需要 1–3 个工作日。
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-6">
          <div>
            <label className="block text-sm font-medium">对象名称 *</label>
            <input required maxLength={120} value={form.requested_name}
              onChange={(e) => setForm({ ...form, requested_name: e.target.value })}
              className="mt-2 w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          </div>
          <div>
            <label className="block text-sm font-medium">对象类型 *</label>
            <select value={form.requested_type} onChange={(e) => setForm({ ...form, requested_type: e.target.value })}
              className="mt-2 w-full border border-border bg-card p-3 text-sm">
              {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">理由（可选）</label>
            <textarea maxLength={500} rows={4} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-2 w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          </div>
          <button disabled={pending} className="border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-50">
            {pending ? "提交中…" : "提交申请"}
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
