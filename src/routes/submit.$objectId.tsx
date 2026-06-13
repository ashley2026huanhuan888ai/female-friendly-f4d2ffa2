import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import { retryObservationAnalysis, submitObservation } from "@/lib/api/platform.functions";
import { Thermometer } from "@/components/Thermometer";
import { bandOf } from "@/lib/temperature";
import { toast } from "sonner";
import { formatTimeForLanguage, useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/submit/$objectId")({
  head: () => ({ meta: [{ title: "提交观察 · 女性友好体验测评" }] }),
  component: SubmitPage,
});

const STEP_KEYS = [
  "submit.step.clean",
  "submit.step.facts",
  "submit.step.knowledge",
  "submit.step.tags",
  "submit.step.evidence",
  "submit.step.temperature",
  "submit.step.update",
] as const;

function SubmitPage() {
  const { language, t, evidence, band: bandLabel, tag } = useI18n();
  usePageMeta("seo.submit.title");
  const { objectId } = Route.useParams();
  const navigate = useNavigate();
  const submit = useServerFn(submitObservation);
  const retrySavedAnalysis = useServerFn(retryObservationAnalysis);
  const { ready, user } = useAuth();
  const [obj, setObj] = useState<{
    id: string;
    name: string;
    type: string;
    temperature: number | null;
  } | null>(null);
  const [content, setContent] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [screenshot_url, setScreenshotUrl] = useState("");
  const [reference_url, setReferenceUrl] = useState("");

  type Phase = "idle" | "analyzing" | "done" | "ai_failed" | "error";
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
    supabase
      .from("objects")
      .select("id,name,type,temperature")
      .eq("id", objectId)
      .maybeSingle()
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
    } catch {
      /* ignore */
    }
  }, [objectId, draftKey]);

  // 自动保存草稿（防抖 600ms）
  useEffect(() => {
    if (phase !== "idle") return;
    const hasAny = content || screenshot_url || reference_url;
    const t = setTimeout(() => {
      try {
        if (hasAny) {
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              content,
              screenshot_url,
              reference_url,
              ts: Date.now(),
            }),
          );
          setDraftSavedAt(Date.now());
        } else {
          localStorage.removeItem(draftKey);
          setDraftSavedAt(null);
        }
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [content, screenshot_url, reference_url, phase, draftKey]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraftSavedAt(null);
    setDraftRestored(false);
  };

  if (ready && !user) {
    return (
      <LoginPrompt
        title={t("submit.loginTitle")}
        body={t("submit.loginBody")}
        redirect={`/submit/${objectId}`}
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

  const runAnalysis = async () => {
    setPhase("analyzing");
    setStepIdx(0);
    setErrorMsg("");

    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i < STEP_KEYS.length - 1 ? i + 1 : i));
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
      setStepIdx(STEP_KEYS.length - 1);
      setResult(res);

      const { data: latest } = await supabase
        .from("objects")
        .select("temperature")
        .eq("id", objectId)
        .maybeSingle();
      setNewTemp((latest as any)?.temperature ?? obj?.temperature ?? null);

      clearDraft();
      // AI 失败但观察已保存 → 进入 ai_failed 阶段，而非 error
      if ((res as any)?.ai_failed) {
        setErrorMsg((res as any)?.error ?? t("submit.aiFailed"));
        setPhase("ai_failed");
      } else {
        setPhase("done");
      }
    } catch (err: any) {
      clearInterval(stepTimer);
      setPhase("error");
      setErrorMsg(err?.message ?? t("submit.unknownError"));
    }
  };

  const runSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) {
      toast.error(t("submit.minLength"));
      return;
    }
    await runAnalysis();
  };

  const retryAnalysis = async () => {
    const savedId = result?.ai_failed ? result.id : null;
    if (!savedId) {
      await runAnalysis();
      return;
    }
    setPhase("analyzing");
    setStepIdx(0);
    setErrorMsg("");
    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i < STEP_KEYS.length - 1 ? i + 1 : i));
    }, 260);
    const minWait = new Promise((r) => setTimeout(r, 1800));

    try {
      const [res] = await Promise.all([retrySavedAnalysis({ data: { id: savedId } }), minWait]);
      clearInterval(stepTimer);
      setStepIdx(STEP_KEYS.length - 1);
      setResult(res);

      const { data: latest } = await supabase
        .from("objects")
        .select("temperature")
        .eq("id", objectId)
        .maybeSingle();
      setNewTemp((latest as any)?.temperature ?? obj?.temperature ?? null);

      if ((res as any)?.ai_failed) {
        setErrorMsg((res as any).error ?? t("submit.aiFailed"));
        setPhase("ai_failed");
        return;
      }
      setPhase("done");
    } catch (err: any) {
      clearInterval(stepTimer);
      setPhase("error");
      setErrorMsg(err?.message ?? t("submit.unknownError"));
    }
  };

  // 分析中页面
  if (phase === "analyzing") {
    return (
      <SiteLayout>
        <div className="container-prose max-w-2xl py-20">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("submit.analyzingEyebrow")}
          </div>
          <h1 className="mt-3 font-serif text-3xl">{t("submit.analyzingTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("submit.analyzingBody")}</p>
          <div className="mt-8 h-1 w-full overflow-hidden bg-border">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${((stepIdx + 1) / STEP_KEYS.length) * 100}%` }}
            />
          </div>
          <ul className="mt-8 space-y-3 text-sm">
            {STEP_KEYS.map((s, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center text-xs ${
                      state === "done"
                        ? "text-foreground"
                        : state === "active"
                          ? "text-accent"
                          : "text-muted-foreground"
                    }`}
                  >
                    {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                  </span>
                  <span className={state === "pending" ? "text-muted-foreground" : ""}>{t(s)}</span>
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
            {result.status === "approved"
              ? t("submit.status.autoApproved")
              : t("submit.status.pending")}
          </div>
          <h1 className="mt-3 font-serif text-3xl">{t("submit.doneTitle")}</h1>

          <div className="mt-8 border border-border bg-card p-6 space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("submit.aiSummary")}
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {result.summary || t("common.noSummary")}
              </p>
            </div>

            {!!result.tags?.length && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("submit.detectedTags")}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.tags.map((t: string) => (
                    <span key={t} className="border border-border px-2 py-1 text-xs">
                      {tag(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("submit.evidenceLevel")}
                </div>
                <div className="mt-2 font-serif text-lg">{evidence(result.evidence_level)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("submit.temperatureContribution")}
                </div>
                <div
                  className={`mt-2 font-serif text-lg tabular-nums ${
                    delta > 0 ? "text-accent" : delta < 0 ? "text-muted-foreground" : ""
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}°C
                </div>
              </div>
            </div>

            {newTemp != null && (
              <div className="flex items-center gap-4 border-t border-border pt-5">
                <Thermometer value={newTemp} size="sm" showLabel={false} />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("submit.currentTemperature")}
                  </div>
                  <div className="mt-1 font-serif text-2xl tabular-nums">
                    {newTemp}°C
                    {band && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {bandLabel(band.band, band.label)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {result.status !== "approved" && (
              <p className="text-xs text-muted-foreground border-t border-border pt-4">
                {t("submit.needsReview")}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate({ to: "/objects/$id", params: { id: objectId } })}
              className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
            >
              {t("submit.backObject")}
            </button>
            <Link
              to="/feed"
              className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              {t("submit.viewFeed")}
            </Link>
            <button
              onClick={() => {
                setContent("");
                setScreenshotUrl("");
                setReferenceUrl("");
                setResult(null);
                setPhase("idle");
              }}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {t("submit.continue")}
            </button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // AI 失败但观察已保存（真实情况）
  if (phase === "ai_failed") {
    const hasLegal = (result as any)?.has_legal_penalty;
    return (
      <SiteLayout>
        <div className="container-prose max-w-2xl py-20">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("submit.savedAiRetry")}
          </div>
          <h1 className="mt-3 font-serif text-2xl">
            {hasLegal ? t("submit.legalSavedTitle") : t("submit.savedPendingTitle")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("submit.aiFailedBody")}</p>
          {hasLegal && <p className="mt-2 text-sm text-foreground">{t("submit.legalUpdated")}</p>}
          {errorMsg && (
            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer">{t("common.details")}</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{errorMsg}</pre>
            </details>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={retryAnalysis}
              className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              {t("submit.retryAI")}
            </button>
            <button
              onClick={() => navigate({ to: "/objects/$id", params: { id: objectId } })}
              className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
            >
              {t("submit.viewObject")}
            </button>
            <Link
              to="/me"
              className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              {t("submit.goMyObservations")}
            </Link>
            <button
              onClick={() => {
                setContent("");
                setScreenshotUrl("");
                setReferenceUrl("");
                setResult(null);
                setErrorMsg("");
                setPhase("idle");
              }}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {t("submit.continue")}
            </button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // 错误页面（serverFn 本身抛错，未保存）
  if (phase === "error") {
    return (
      <SiteLayout>
        <div className="container-prose max-w-2xl py-20">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("submit.notice")}
          </div>
          <h1 className="mt-3 font-serif text-2xl">{t("submit.failedTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("submit.failedBody")}</p>
          {errorMsg && (
            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer">{t("common.details")}</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{errorMsg}</pre>
            </details>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => runAnalysis()}
              className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
            >
              {t("submit.retrySubmit")}
            </button>
            <button
              onClick={() => setPhase("idle")}
              className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              {t("submit.backEdit")}
            </button>
            <button
              onClick={() => navigate({ to: "/objects/$id", params: { id: objectId } })}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {t("submit.backObject")}
            </button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">{t("submit.draftSavedNotice")}</p>
        </div>
      </SiteLayout>
    );
  }

  // 提交表单（极简）
  return (
    <SiteLayout>
      <div className="container-prose max-w-2xl py-16">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("submit.formEyebrow")}
        </div>
        <h1 className="mt-3 font-serif text-4xl">{obj?.name ?? "—"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("submit.formBody")}</p>

        {draftRestored && (
          <div className="mt-6 flex items-center justify-between gap-3 border border-dashed border-border bg-card/60 p-3 text-xs">
            <span className="text-muted-foreground">{t("submit.draftRestored")}</span>
            <button
              type="button"
              onClick={() => {
                setContent("");
                setScreenshotUrl("");
                setReferenceUrl("");
                clearDraft();
              }}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("submit.clearDraft")}
            </button>
          </div>
        )}

        <form onSubmit={runSubmit} className="mt-10 space-y-6">
          <div>
            <label className="block text-sm font-medium">{t("submit.question")}</label>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("submit.placeholder")}
              className="mt-2 w-full border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
            />
            <div className="mt-3 border-l-2 border-border pl-3 text-xs text-muted-foreground leading-relaxed">
              {t("submit.autoWill")}
              <div className="mt-1 space-y-0.5">
                <div>{t("submit.autoFacts")}</div>
                <div>{t("submit.autoTags")}</div>
                <div>{t("submit.autoEvidence")}</div>
                <div>{t("submit.autoTemperature")}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                {t("common.wordCount", { count: content.length })} · {t("submit.limits")}
              </span>
              {draftSavedAt && (
                <span>
                  {t("submit.draftSavedAt", {
                    time: formatTimeForLanguage(draftSavedAt, language),
                  })}
                </span>
              )}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {showOptional ? t("submit.optionalOpen") : t("submit.optionalClosed")}
            </button>
            {showOptional && (
              <div className="mt-4 space-y-4 border-l-2 border-border pl-4">
                <div>
                  <label className="block text-xs text-muted-foreground">
                    {t("submit.screenshotUrl")}
                  </label>
                  <input
                    type="url"
                    maxLength={500}
                    value={screenshot_url}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full border border-border bg-card p-2 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">
                    {t("submit.referenceUrl")}
                  </label>
                  <input
                    type="url"
                    maxLength={500}
                    value={reference_url}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full border border-border bg-card p-2 text-sm outline-none focus:border-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          <button className="border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent hover:border-accent">
            {t("objects.submitObservation")}
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
