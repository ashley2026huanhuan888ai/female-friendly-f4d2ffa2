import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { submitObservation } from "@/lib/api/platform.functions";
import { LoginPrompt } from "@/components/LoginPrompt";
import { toast } from "sonner";

export const Route = createFileRoute("/submit/$objectId")({
  head: () => ({ meta: [{ title: "提交观察 · 女性友好体验测评" }] }),
  component: SubmitPage,
});

function SubmitPage() {
  const { objectId } = Route.useParams();
  const navigate = useNavigate();
  const submit = useServerFn(submitObservation);
  const [obj, setObj] = useState<any>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [form, setForm] = useState({ content: "", scene: "", screenshot_url: "", reference_url: "" });
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState(0); // 0 idle, 1 校验, 2 AI分析, 3 入库, 4 完成
  const stageLabels = ["", "正在校验内容…", "AI 正在分析与清洗…", "正在提交入库…", "已提交"];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    supabase.from("objects").select("id,name,type").eq("id", objectId).maybeSingle().then(({ data }) => setObj(data));
  }, [objectId]);

  if (authed === false) {
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center">
          <h1 className="font-serif text-3xl">需要登录</h1>
          <p className="mt-3 text-sm text-muted-foreground">提交观察前请先登录。</p>
          <Link to="/login" search={{ redirect: `/submit/${objectId}` }} className="mt-6 inline-block border border-foreground px-5 py-2.5 text-sm hover:bg-foreground hover:text-background">
            前往登录
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.content.trim().length < 10) {
      toast.error("观察内容至少 10 字");
      return;
    }
    setPending(true);
    setStage(1);
    // 模拟阶段推进，给用户即时反馈（真实进度由服务器执行）
    const t1 = setTimeout(() => setStage(2), 400);
    const t2 = setTimeout(() => setStage((s) => (s < 3 ? 3 : s)), 6000);
    try {
      const res = await submit({
        data: {
          object_id: objectId,
          content: form.content,
          scene: form.scene || null,
          screenshot_url: form.screenshot_url || null,
          reference_url: form.reference_url || null,
        },
      });
      clearTimeout(t1); clearTimeout(t2);
      setStage(4);
      const msg = res.status === "approved"
        ? "已自动通过！(您是可信用户)"
        : `已提交，等待审核 · 证据 ${res.evidence_level} · 风险 ${res.risk_level}`;
      toast.success(msg);
      navigate({ to: "/objects/$id", params: { id: objectId } });
    } catch (err: any) {
      clearTimeout(t1); clearTimeout(t2);
      setStage(0);
      toast.error(err.message || "提交失败");
    } finally {
      setPending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container-prose max-w-2xl py-16">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">提交观察</div>
        <h1 className="mt-3 font-serif text-4xl">{obj?.name ?? "—"}</h1>

        <div className="mt-6 border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          请客观描述你观察到的现象。AI 会自动清洗内容、识别标签、判定证据等级。
          <strong className="text-foreground"> 攻击性、辱骂性内容会被标记为 D 级并不参与温度计算。</strong>
          <div className="mt-2">提交频率限制：同一对象 24 小时内 1 条；全平台 24 小时内最多 3 条。</div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <Field label="观察内容 *" hint="10–2000 字。请描述事实，避免人身攻击。">
            <textarea
              required minLength={10} maxLength={2000} rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
          </Field>
          <Field label="出现的场景" hint="例如：广告片 / 第三季第五集 / 公司年会">
            <input maxLength={200} value={form.scene} onChange={(e) => setForm({ ...form, scene: e.target.value })}
              className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          </Field>
          <Field label="截图链接（可选）">
            <input type="url" maxLength={500} value={form.screenshot_url} onChange={(e) => setForm({ ...form, screenshot_url: e.target.value })}
              placeholder="https://..." className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          </Field>
          <Field label="参考链接（可选）">
            <input type="url" maxLength={500} value={form.reference_url} onChange={(e) => setForm({ ...form, reference_url: e.target.value })}
              placeholder="https://..." className="w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground" />
          </Field>

          <div className="flex items-center gap-4">
            <button disabled={pending} className="border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent hover:border-accent disabled:opacity-50">
              {pending ? stageLabels[stage] || "处理中…" : "提交观察"}
            </button>
            {pending && (
              <div className="flex-1">
                <div className="h-1 w-full overflow-hidden rounded bg-border">
                  <div
                    className="h-full bg-foreground transition-all duration-500"
                    style={{ width: `${(stage / 4) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {["校验内容", "AI 分析", "入库", "完成"].map((l, i) => (
                    <span key={l} className={stage >= i + 1 ? "text-foreground" : ""}>
                      {stage > i + 1 ? "✓ " : stage === i + 1 ? "● " : "○ "}{l}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">通常需 5–15 秒，请勿关闭页面。</div>
              </div>
            )}
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {hint && <div className="mb-2 mt-1 text-xs text-muted-foreground">{hint}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
