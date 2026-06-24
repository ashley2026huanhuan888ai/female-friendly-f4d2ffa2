import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { Thermometer } from "@/components/Thermometer";
import { getHomeSummary } from "@/lib/api/observation-center.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";
import { highlightKeywords } from "@/lib/highlight-keywords";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "女性友好体验测评 · 观察平台" },
      {
        name: "description",
        content: "持续观察品牌、产品、影视、组织的女性体验。AI 引擎、可追溯温度、可解释变化。",
      },
      { property: "og:title", content: "女性友好体验测评" },
      { property: "og:description", content: "观察 · 分析 · 不审判。" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t, objectType, tag: tagLabel, language } = useI18n();
  usePageMeta("seo.home.title", "seo.home.description");
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [obsStatus, setObsStatus] = useState<"loading" | "ready" | "error">("loading");
  const fetchSummary = useServerFn(getHomeSummary);
  const sentenceGap = language === "en" ? " " : "";
  const topicWall = (summary?.trending_tags ?? []).slice(0, 14);
  const maxTopicCount = Math.max(1, ...topicWall.map((item: any) => Number(item.count) || 0));

  const loadSummary = useCallback(() => {
    setObsStatus("loading");
    fetchSummary()
      .then((data) => {
        setSummary(data);
        setObsStatus("ready");
      })
      .catch(() => {
        setSummary({
          today_events: [],
          today_events_count: 0,
          heating: [],
          cooling: [],
          latest_cases: [],
          latest_observations: [],
          newest_objects: [],
          trending_tags: [],
        });
        setObsStatus("error");
      });
  }, [fetchSummary]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="">
        <div className="container-prose grid gap-8 pt-10 pb-14 md:grid-cols-[1.5fr_1fr] md:gap-10 md:pt-10 md:pb-16">
          <div>
            <div className="inline-block text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:tracking-[0.2em]">
              Observatory · Est. 2026
            </div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] text-balance md:text-7xl">
              {t("home.hero.title.before")}
              <span className="text-accent">{t("home.hero.title.accent")}</span>
              {t("home.hero.title.after")}
            </h1>
            <ol className="mt-6 grid grid-cols-3 gap-3 text-left md:mt-8">
              {([1, 2, 3] as const).map((n) => (
                <li key={n}>
                  <Link
                    to="/login"
                    aria-label={t(`home.steps.${n}` as never)}
                    className="flex h-full flex-col gap-1 border border-border bg-card p-2 transition-colors hover:border-foreground hover:bg-card/80 sm:flex-row sm:items-start sm:gap-3 sm:p-4"
                  >
                    <span className="font-mono text-[10px] tabular-nums text-accent sm:text-xs">
                      0{n}
                    </span>
                    <span className="text-[11px] leading-snug text-foreground sm:text-sm sm:leading-6">
                      {t(`home.steps.${n}` as never)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-md text-sm text-muted-foreground md:mt-8 md:max-w-2xl md:text-base">
              {t("home.hero.body")}
              {sentenceGap}
              <strong className="text-foreground">{t("home.hero.disclaimer")}</strong>
              {sentenceGap}
              {t("home.hero.actions")}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/objects?q=${encodeURIComponent(q)}`;
              }}
              className="mt-8 flex w-full max-w-md border border-foreground md:mt-10 md:max-w-lg"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("home.search.placeholder")}
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-accent px-5 py-3 text-sm text-accent-foreground hover:bg-accent/90">
                {t("home.search.button")}
              </button>
            </form>
            <div className="mt-6 flex max-w-md flex-wrap gap-3">
              <Link
                to="/objects"
                className="border border-accent bg-accent px-4 py-2 text-xs uppercase tracking-wider text-accent-foreground hover:bg-accent/90"
              >
                {t("home.cta.browse")}
              </Link>
              <Link
                to="/feed"
                className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
              >
                {t("home.cta.feed")}
              </Link>
              <Link
                to="/feedback"
                className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
              >
                {t("home.cta.feedback")}
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("home.topicWall.title")}
            </div>
            {topicWall.length ? (
              <>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2 leading-none">
                  {topicWall.map((item: any) => {
                    const label = tagLabel(item.tag);
                    return (
                      <Link
                        key={item.tag}
                        to="/objects"
                        search={{ tag: item.tag }}
                        aria-label={t("home.topicWall.viewTopic", { tag: label })}
                        className={`${topicWordClass(Number(item.count) || 0, maxTopicCount)} underline-offset-4 hover:text-accent hover:underline`}
                      >
                        #{label}
                      </Link>
                    );
                  })}
                </div>
                <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                  {t("home.topicWall.hint")}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground/80">
                  {t("home.topicWall.trust")}
                </p>
              </>
            ) : (
              <p className="mt-6 text-sm leading-6 text-muted-foreground">
                {t("home.topicWall.empty")}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <Link
                to="/topics"
                className="block rounded-md transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="font-mono text-lg tabular-nums">{topicWall.length || "—"}</div>
                <div className="mt-1 text-muted-foreground">{t("home.topicWall.active")}</div>
              </Link>
              <Link
                to="/objects"
                className="block rounded-md transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="font-mono text-lg tabular-nums">
                  {summary?.total_objects ?? "—"}
                </div>
                <div className="mt-1 text-muted-foreground">{t("home.topicWall.objects")}</div>
              </Link>
            </div>
          </div>
        </div>
      </section>




      {/* 近期升温 */}
      <section className="py-16">
        <div className="container-prose">
          <ColumnList
            title={t("home.heating")}
            hint={t("home.heatingHint")}
            items={(summary?.heating ?? []).filter((o: any) => Number(o.temperature_after ?? o.temperature ?? 0) >= 40)}
            positive
          />
        </div>
      </section>




      {/* 最新 AI 观察 */}
      <section className="py-16">
        <div className="container-prose">
          <h2 className="font-serif text-2xl">{t("home.latestAI")}</h2>
          <p className="text-xs text-muted-foreground">{t("home.latestAIHint")}</p>
          {obsStatus === "loading" ? (
            <ul className="mt-6 grid gap-4 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-y-0" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="py-4 md:border-b md:border-border">
                  <div className="h-3 w-32 animate-pulse bg-muted/60" />
                  <div className="mt-2 h-3 w-full animate-pulse bg-muted/40" />
                  <div className="mt-1 h-3 w-4/5 animate-pulse bg-muted/40" />
                </li>
              ))}
            </ul>
          ) : obsStatus === "error" ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-sm text-destructive">{t("common.loadError")}</p>
              <button
                type="button"
                onClick={loadSummary}
                className="border border-foreground px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-foreground hover:text-background"
              >
                {t("common.retry")}
              </button>
            </div>
          ) : summary?.latest_observations?.length ? (
            <ul className="mt-6 grid gap-4 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-y-0 animate-fade-in">
              {summary.latest_observations.slice(0, 6).map((o: any) => {
                const inner = (
                  <>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {o.object ? o.object.name : "—"} · {t("common.evidence")} {o.evidence_level ?? "—"}
                    </div>
                    <p className="mt-1 text-sm">{o.summary ? highlightKeywords(o.summary) : t("common.noSummary")}</p>
                  </>
                );
                return (
                  <li key={o.id} className="md:border-b md:border-border">
                    {o.object ? (
                      <Link
                        to="/objects/$id"
                        params={{ id: o.object.id }}
                        className="block py-4 hover:bg-card/60"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="py-4">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{t("common.noObservations")}</p>
          )}
        </div>
      </section>

      {/* 提交 / 申请 CTA */}
      <section className="bg-card/40 py-16">
        <div className="container-prose">
          <div className="border border-border bg-paper p-6">
            <h3 className="font-serif text-xl">{t("home.submitCardTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("home.submitCardBody")}</p>
            <Link
              to="/objects"
              className="mt-4 inline-block border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
            >
              {t("home.selectObject")}
            </Link>
          </div>
        </div>
      </section>

      {/* 知识库（次要） */}
      <section className="py-12">
        <div className="container-prose">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("home.researchEyebrow")}
          </div>
          <h2 className="mt-2 font-serif text-xl text-muted-foreground">
            {t("home.researchTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{t("home.researchBody")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link
              to="/knowledge"
              className="border border-border bg-card/60 p-4 text-sm hover:border-foreground/40"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("home.knowledgeTitle")}
              </div>
              <div className="mt-1 font-serif">{t("home.knowledgeBody")}</div>
            </Link>
            <Link
              to="/topics"
              className="border border-border bg-card/60 p-4 text-sm hover:border-foreground/40"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("home.topicsTitle")}
              </div>
              <div className="mt-1 font-serif">{t("home.topicsBody")}</div>
            </Link>
          </div>
          {summary?.latest_cases?.length ? (
            <ul className="mt-6 divide-y divide-border border-t border-border text-sm">
              {summary.latest_cases.slice(0, 4).map((c: any) => (
                <li key={c.code} className="py-3">
                  <Link
                    to="/archive/$caseCode"
                    params={{ caseCode: c.code }}
                    className="block text-muted-foreground hover:text-foreground"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider">{c.code}</span>
                    <span className="ml-3 font-serif">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </SiteLayout>
  );
}

function topicWordClass(count: number, maxCount: number) {
  const ratio = maxCount <= 0 ? 0 : count / maxCount;
  if (ratio >= 0.78) return "font-serif text-3xl text-foreground md:text-4xl";
  if (ratio >= 0.5) return "font-serif text-2xl text-foreground";
  if (ratio >= 0.28) return "text-base text-foreground";
  return "text-sm text-muted-foreground";
}

function ColumnList({
  title,
  hint,
  items,
  positive,
}: {
  title: string;
  hint: string;
  items: any[];
  positive?: boolean;
}) {
  const { t, objectType, tag: tagLabel, evidence } = useI18n();
  const prefix = positive ? "home.heatingDetail" : "home.coolingDetail";
  const pickDetailKey = (count: number, hasTag: boolean, hasLevel: boolean) => {
    if (count > 0 && hasTag && hasLevel) return `${prefix}.full` as const;
    if (count > 0 && hasLevel) return `${prefix}.noTag` as const;
    if (count > 0 && hasTag) return `${prefix}.noLevel` as const;
    if (count > 0) return `${prefix}.countOnly` as const;
    return `${prefix}.minimal` as const;
  };
  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("home.noWeeklyChange")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {items.map((o) => {
            const count = Number(o.evidence_7d_count ?? 0);
            const hasTag = !!o.top_tag;
            const hasLevel = !!o.top_evidence_level;
            const before = Number(o.temperature_before ?? o.temperature);
            const after = Number(o.temperature_after ?? o.temperature);
            const detail = t(pickDetailKey(count, hasTag, hasLevel) as never, {
              count,
              tag: hasTag ? tagLabel(o.top_tag) : "",
              level: hasLevel ? evidence(o.top_evidence_level) : "",
              before: before.toFixed(1).replace(/\.0$/, ""),
              after: after.toFixed(1).replace(/\.0$/, ""),
            });
            return (
              <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {objectType(o.type)}
                  </div>
                  <Link
                    to="/objects/$id"
                    params={{ id: o.id }}
                    className="block font-serif hover:text-accent"
                  >
                    {o.name}
                  </Link>
                  {Array.isArray(o.top_tags) && o.top_tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {o.top_tags.slice(0, 2).map((tg: string) => (
                        <Link
                          key={tg}
                          to="/objects"
                          search={{ tag: tg }}
                          className="border border-accent bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground hover:bg-accent/90"
                        >
                          #{tagLabel(tg)}
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    to="/objects/$id"
                    params={{ id: o.id }}
                    className="mt-1 block max-w-[28ch] text-xs leading-5 text-muted-foreground hover:text-foreground"
                  >
                    {detail}
                  </Link>
                </div>
                <Link to="/objects/$id" params={{ id: o.id }} className="shrink-0">
                  <Thermometer value={o.temperature} size="lg" showLabel={false} />
                </Link>
              </li>
            );
          })}

        </ul>
      )}
    </div>
  );
}
