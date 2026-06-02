import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { submitObservation } from "@/lib/api/platform.functions";
import { Thermometer } from "@/components/Thermometer";
import { bandOf } from "@/lib/temperature";
import { toast } from "sonner";

export const Route = createFileRoute("/submit/$objectId")({
  head: () => ({ meta: [{ title: "提交观察 · 女性友好体验测评" }] }),
  component: SubmitPage,
});

const STEPS = [
  "内容清洗",
  "提取事实",
  "匹配知识库",
  "识别议题标签",
  "评估证据等级",
  "生成温度贡献",
  "更新对象温度",
];

const EVIDENCE_LABEL: Record<string, string> = {
  A: "A · 强证据", B: "B · 一般证据", C: "C · 弱证据", D: "D · 仅供参考",
};

function SubmitPage() {
  const { objectId } = Route.useParams();
  const navigate = useNavigate();
  const submit = useServerFn(submitObservation);
  const [obj, setObj] = useState<{ id: string; name: string; type: string; temperature: number | null } | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [content, setContent] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [screenshot_url, setScreenshotUrl] = useState("");
  const [reference_url, setReferenceUrl] = useState("");

  type Phase = "idle" | "analyzing" | "done" | "error";
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [newTemp, setNewTemp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const draftKey = `submit-draft:${objectId}`;
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  // 初次挂载：恢复草稿 + 拉对象/登录态
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    supabase.from("objects").select("id,name,type,temperature").eq("id", objectId).maybeSingle()
      .then(({ data }) => setObj(data as any));
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.content) setContent(d.content);
        if (d?.screenshot_url) setScreenshotUrl(d.screenshot_url);
        if (d?.reference_url) setReferenceUrl(d.reference_url);
        if (d?.screenshot_url || d?.reference_url) setShowOptional(true);
        if (d?.content || d?.screenshot_url || d?.reference_url) setDraftRestored(true);
      }
    } catch { /* ignore */ }
  }, [objectId, draftKey]);

  // 自动保存草稿（防抖 600ms）
  useEffect(() => {
    if (phase !== "idle") return;
    const hasAny = content || screenshot_url || reference_url;
    const t = setTimeout(() => {
      try {
        if (hasAny) {
          localStorage.setItem(draftKey, JSON.stringify({
            content, screenshot_url, reference_url, ts: Date.now(),
          }));
          setDraftSavedAt(Date.now());
        } else {
          localStorage.removeItem(draftKey);
          setDraftSavedAt(null);
        }
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
  }, [content, screenshot_url, reference_url, phase, draftKey]);

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setDraftSavedAt(null);
    setDraftRestored(false);
  };

  if (authed === false) {
    return (
      <LoginPrompt
        title="登录后提交观察"
        body="登录用于防止刷屏和保护观察质量。你登录后会自动回到当前提交页面。"
        redirect={`/submit/${objectId}`}
      />
    );
  }

  const runSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) {
      toast.error("观察内容至少 10 字");
      return;
    }
    setPhase("analyzing");
    setStepIdx(0);
    setErrorMsg("");

    // 步骤逐步推进：约每 260ms 推进一步（最短全程 ~1.8s）
    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 260);
    const minWait = new Promise((r) => setTimeout(r, 1800));

    try {
      const [res] = await Promise.all([
        submit({
          data: {
            object_id: objectId,
            content,
            scene: null,
            screenshot_url: screenshot_url || null,
            reference_url: reference_url || null,
          },
        }),
        minWait,
      ]);
      clearInterval(stepTimer);
      setStepIdx(STEPS.length - 1);
      setResult(res);

      // 拉一次最新温度
      const { data: latest } = await supabase
        .from("objects").select("temperature").eq("id", objectId).maybeSingle();
      setNewTemp((latest as any)?.temperature ?? obj?.temperature ?? null);

      setPhase("done");
    } catch (err: any) {
      clearInterval(stepTimer);
      setPhase("error");
      setErrorMsg(err?.message ?? "未知错误");
    }
  };

  // 分析中页面
  if (phase === "analyzing") {
    return (
      <SiteLayout>
        <div className="container-prose max-w-2xl py-20">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">AI 分析中</div>
          <h1 className="mt-3 font-serif text-3xl">正在分析你的观察…</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            通常 5–15 秒，请勿关闭页面。系统会自动完成清洗、识别与温度更新。
          </p>
          <div className="mt-8 h-1 w-full overflow-hidden bg-border">
            <div className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }} />
          </div>
          <ul className="mt-8 space-y-3 text-sm">
            {STEPS.map((s, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className={`inline-flex h-5 w-5 items-center justify-center text-xs ${
                    state === "done" ? "text-foreground" :
                    state === "active" ? "text-accent" : "text-muted-foreground"
                  }`}>
                    {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                  </span>
                  <span className={state === "pending" ? "text-muted-foreground" : ""}>{s}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </SiteLayout>
    );
  }

  // 完成页面
  if (phase === "done" && result) {
    const delta = result.impact_score ?? 0;
    const band = newTemp != null ? bandOf(newTemp) : null;
    return (
      <SiteLayout>
        <div className="container-prose max-w-2xl py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {result.status === "approved" ? "已自动通过" : "已提交 · 等待审核"}
          </div>
          <h1 className="mt-3 font-serif text-3xl">分析完成</h1>

          <div className="mt-8 border border-border bg-card p-6 space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">AI 摘要</div>
              <p className="mt-2 text-sm leading-relaxed">{result.summary || "（无摘要）"}</p>
            </div>

            {!!result.tags?.length && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">识别标签</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.tags.map((t: string) => (
                    <span key={t} className="border border-border px-2 py-1 text-xs">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">证据等级</div>
                <div className="mt-2 font-serif text-lg">
                  {EVIDENCE_LABEL[result.evidence_level] ?? result.evidence_level ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">温度贡献</div>
                <div className={`mt-2 font-serif text-lg tabular-nums ${
                  delta > 0 ? "text-accent" : delta < 0 ? "text-muted-foreground" : ""
                }`}>
                  {delta > 0 ? "+" : ""}{delta}°C
                </div>
              </div>
            </div>

            {newTemp != null && (
              <div className="flex items-center gap-4 border-t border-border pt-5">
                <Thermometer value={newTemp} size="sm" showLabel={false} />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">当前对象温度</div>
                  <div className="mt-1 font-serif text-2xl tabular-nums">
                    {newTemp}°C
                    {band && <span className="ml-2 text-sm text-muted-foreground">{band.label}</span>}
                  </div>
                </div>
              </div>
            )}

            {result.status !== "approved" && (
              <p className="text-xs text-muted-foreground border-t border-border pt-4">
                此条提交需管理员复核后才会计入对象温度。可在「我的」页查看进度。
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate({ to: "/objects/$id", params: { id: objectId } })}
              className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
            >
              返回对象页
            </button>
            <Link
              to="/feed"
              className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              查看全部观察
            </Link>
            <button
              onClick={() => {
                setContent(""); setScreenshotUrl(""); setReferenceUrl("");
                setResult(null); setPhase("idle");
              }}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              继续提交观察
            </button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // 错误页面（AI/网络失败但可能已保存）
  if (phase === "error") {
    return (
      <SiteLayout>
        <div className="container-prose max-w-2xl py-20">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">提示</div>
          <h1 className="mt-3 font-serif text-2xl">分析暂时不可用</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            你的观察已经保存。管理员稍后可重新分析，结果会出现在对象页与「我的」页中。
          </p>
          {errorMsg && (
            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer">技术细节</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{errorMsg}</pre>
            </details>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate({ to: "/objects/$id", params: { id: objectId } })}
              className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background"
            >
              返回对象页
            </button>
            <button
              onClick={() => setPhase("idle")}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              再试一次
            </button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // 提交表单（极简）
  return (
    <SiteLayout>
      <div className="container-prose max-w-2xl py-16">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">提交观察</div>
        <h1 className="mt-3 font-serif text-4xl">{obj?.name ?? "—"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          只需写下你观察到的现象，其余由 AI 完成。
        </p>

        <form onSubmit={runSubmit} className="mt-10 space-y-6">
          <div>
            <label className="block text-sm font-medium">你观察到了什么？*</label>
            <textarea
              required minLength={10} maxLength={2000} rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`例如：\n· 某广告中女性始终负责家务劳动，男性负责做决定。\n· 某影视作品中女性角色几乎没有独立剧情。\n· 某品牌营销内容长期聚焦女性外貌评价。`}
              className="mt-2 w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
            <div className="mt-3 border-l-2 border-border pl-3 text-xs text-muted-foreground leading-relaxed">
              提交后系统会自动：
              <div className="mt-1 space-y-0.5">
                <div>✓ 提取事实</div>
                <div>✓ 识别议题标签</div>
                <div>✓ 判断证据等级</div>
                <div>✓ 更新女性体验温度</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {content.length} / 2000 字 · 至少 10 字 · 同一对象 24 小时内仅可提交 1 条
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {showOptional ? "▾" : "▸"} 可选附件（截图 / 参考链接）
            </button>
            {showOptional && (
              <div className="mt-4 space-y-4 border-l-2 border-border pl-4">
                <div>
                  <label className="block text-xs text-muted-foreground">截图链接</label>
                  <input type="url" maxLength={500} value={screenshot_url}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full border border-border bg-card p-2 text-sm outline-none focus:border-foreground" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">参考链接</label>
                  <input type="url" maxLength={500} value={reference_url}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full border border-border bg-card p-2 text-sm outline-none focus:border-foreground" />
                </div>
              </div>
            )}
          </div>

          <button
            className="border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent hover:border-accent"
          >
            提交观察
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
