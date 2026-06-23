import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { Thermometer } from "@/components/Thermometer";
import { getHomeSummary } from "@/lib/api/observation-center.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";

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
  const fetchSummary = useServerFn(getHomeSummary);
  const sentenceGap = language === "en" ? " " : "";
  const topicWall = (summary?.trending_tags ?? []).slice(0, 14);
  const maxTopicCount = Math.max(1, ...topicWall.map((item: any) => Number(item.count) || 0));

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(() =>
        setSummary({
          today_events: [],
          today_events_count: 0,
          heating: [],
          cooling: [],
          latest_cases: [],
          latest_observations: [],
          newest_objects: [],
          trending_tags: [],
        }),
      );
  }, [fetchSummary]);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="container-prose grid gap-10 py-16 md:grid-cols-[1.5fr_1fr] md:py-24">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Observatory · Est. 2026
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-balance md:text-7xl">
              {t("home.hero.title.before")}
              <span className="text-accent">{t("home.hero.title.accent")}</span>
              {t("home.hero.title.after")}
            </h1>
            <p className="mt-8 max-w-2xl text-base text-muted-foreground">
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
              className="mt-10 flex max-w-lg border border-foreground"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("home.search.placeholder")}
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-foreground px-5 py-3 text-sm text-background hover:bg-accent">
                {t("home.search.button")}
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/objects"
                className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
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
              </>
            ) : (
              <p className="mt-6 text-sm leading-6 text-muted-foreground">
                {t("home.topicWall.empty")}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div>
                <div className="font-mono text-lg tabular-nums">{topicWall.length || "—"}</div>
                <div className="mt-1 text-muted-foreground">{t("home.topicWall.active")}</div>
              </div>
              <div>
                <div className="font-mono text-lg tabular-nums">
                  {summary?.total_objects ?? "—"}
                </div>
                <div className="mt-1 text-muted-foreground">{t("home.topicWall.objects")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 新加入测评对象 */}
      <section className="border-b border-border py-16">
        <div className="container-prose">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-3xl">{t("home.newObjects")}</h2>
            <Link
              to="/objects"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          {summary?.newest_objects?.length ? (
            <ul className="mt-8 grid gap-3 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-y-0">
              {summary.newest_objects.map((o: any) => (
                <li key={o.id} className="md:border-b md:border-border">
                  <Link
                    to="/objects/$id"
                    params={{ id: o.id }}
                    className="flex items-center gap-3 py-3 hover:bg-card/60"
                  >
                    <Thermometer
                      value={o.temperature}
                      size="sm"
                      showLabel={false}
                      unmeasured={(o.observation_count ?? 0) === 0}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {objectType(o.type)}
                      </div>
                      <div className="truncate font-serif">{o.name}</div>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {t("common.observationCount", { count: o.observation_count ?? 0 })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{t("common.noObjects")}</p>
          )}
        </div>
      </section>

      {/* 近期升温 / 降温 */}
      <section className="border-b border-border py-16">
        <div className="container-prose grid gap-10 md:grid-cols-2">
          <ColumnList
            title={t("home.heating")}
            hint={t("home.heatingHint")}
            items={summary?.heating ?? []}
            positive
          />
          <ColumnList
            title={t("home.cooling")}
            hint={t("home.coolingHint")}
            items={summary?.cooling ?? []}
          />
        </div>
      </section>

      {/* 最近温度事件 */}
      <section className="border-b border-border py-16">
        <div className="container-prose">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-3xl">{t("home.latestEvents")}</h2>
            <Link
              to="/feed"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          {!summary?.today_events?.length ? (
            <p className="mt-10 border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              {t("home.noEvents24h")}
            </p>
          ) : (
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {summary.today_events.map((e: any, i: number) => (
                <FeedEventCard key={i} ev={{ ...e, id: String(i) }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 最新 AI 观察 */}
      <section className="border-b border-border py-16">
        <div className="container-prose">
          <h2 className="font-serif text-2xl">{t("home.latestAI")}</h2>
          <p className="text-xs text-muted-foreground">{t("home.latestAIHint")}</p>
          {summary?.latest_observations?.length ? (
            <ul className="mt-6 grid gap-4 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-y-0">
              {summary.latest_observations.slice(0, 6).map((o: any) => (
                <li key={o.id} className="py-4 md:border-b md:border-border">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {o.object ? (
                      <Link
                        to="/objects/$id"
                        params={{ id: o.object.id }}
                        className="underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {o.object.name}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {t("common.evidence")} {o.evidence_level ?? "—"}
                  </div>
                  <p className="mt-1 text-sm">{o.summary ?? t("common.noSummary")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{t("common.noObservations")}</p>
          )}
        </div>
      </section>

      {/* 提交 / 申请 CTA */}
      <section className="border-b border-border bg-card/40 py-16">
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
  const { t, objectType } = useI18n();
  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("home.noWeeklyChange")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {items.map((o) => (
            <li key={o.id}>
              <Link
                to="/objects/$id"
                params={{ id: o.id }}
                className="flex items-center gap-3 py-3 hover:bg-card/60"
              >
                <Thermometer value={o.temperature} size="sm" showLabel={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {objectType(o.type)}
                  </div>
                  <div className="truncate font-serif">{o.name}</div>
                </div>
                <span
                  className={`font-mono text-sm tabular-nums ${positive ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {o.delta_7d > 0 ? "+" : ""}
                  {o.delta_7d}°C
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
