import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { ArchiveStamp, HeatRuler, PaperSheet } from "@/components/archive-ui";
import { getHomeSummary } from "@/lib/api/observation-center.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

const RECORD_TYPE_OPTIONS = ["brand", "film", "service", "game", "event", "organization"] as const;

function Index() {
  const { t, objectType, tag: tagLabel, language } = useI18n();
  usePageMeta("seo.home.title", "seo.home.description");
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [recordType, setRecordType] = useState<(typeof RECORD_TYPE_OPTIONS)[number]>("brand");
  const [summary, setSummary] = useState<any>(null);
  const fetchSummary = useServerFn(getHomeSummary);
  const sentenceGap = language === "en" ? " " : "";
  const archiveCopy = getArchiveHomeCopy(language);
  const topicWall = (summary?.trending_tags ?? []).slice(0, 12);
  const archiveRows = (summary?.newest_objects ?? []).slice(0, 5);
  const heatValue = archiveRows.find((item: any) => (item.observation_count ?? 0) > 0)?.temperature;

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
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div className="pt-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Female-Friendly Experience Archive · Est. 2026
              </div>
              <h1 className="mt-7 max-w-2xl font-serif text-6xl leading-[0.96] text-balance md:text-8xl">
                {archiveCopy.hero.before}
                <span className="archive-marker">{archiveCopy.hero.accent}</span>
                {archiveCopy.hero.after}
              </h1>
              <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed">
                {archiveCopy.hero.body}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                <strong className="text-foreground">{t("home.hero.disclaimer")}</strong>
                {sentenceGap}
                {archiveCopy.hero.actions}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = `/objects?q=${encodeURIComponent(q)}`;
                }}
                className="mt-8 flex max-w-xl border-2 border-foreground bg-paper"
              >
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("home.search.placeholder")}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button className="bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-[var(--archive-pink)]">
                  {t("home.search.button")}
                </button>
              </form>

              {topicWall.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
                  <span className="text-xs text-muted-foreground">
                    {t("home.topicWall.title")}:
                  </span>
                  {topicWall.slice(0, 6).map((item: any) => {
                    const label = tagLabel(item.tag);
                    return (
                      <Link
                        key={item.tag}
                        to="/topics/$tag"
                        params={{ tag: item.tag }}
                        aria-label={t("home.topicWall.viewTopic", { tag: label })}
                        className="border border-border bg-paper px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                      >
                        #{label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <PaperSheet tone="offset" className="p-6 md:p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({
                    to: "/objects",
                    search: { type: recordType },
                  });
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground pb-4">
                  <div>
                    <h2 className="font-serif text-3xl">{archiveCopy.intake.title}</h2>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {archiveCopy.intake.code}
                    </p>
                  </div>
                  <ArchiveStamp>{archiveCopy.table.pending}</ArchiveStamp>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-medium">{archiveCopy.intake.types}</div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    {RECORD_TYPE_OPTIONS.map((type) => (
                      <label
                        key={type}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 border border-border px-3 py-2 hover:border-foreground/60",
                          recordType === type && "border-[var(--archive-pink)] bg-card",
                        )}
                      >
                        <input
                          type="radio"
                          name="archive-record-type"
                          value={type}
                          checked={recordType === type}
                          onChange={() => setRecordType(type)}
                          className="accent-[var(--archive-pink)]"
                        />
                        <span>{objectType(type)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder={archiveCopy.intake.bodyPlaceholder}
                  className="mt-5 w-full resize-none border border-foreground/70 bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                />

                <label className="mt-4 block">
                  <span className="text-xs text-muted-foreground">{archiveCopy.intake.source}</span>
                  <input
                    type="url"
                    placeholder={archiveCopy.intake.sourcePlaceholder}
                    className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                  />
                </label>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                  <Link
                    to="/about"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {archiveCopy.intake.rules}
                  </Link>
                  <button
                    type="submit"
                    className="border border-[var(--archive-pink)] bg-[var(--archive-pink)] px-5 py-2.5 text-sm font-medium text-white hover:bg-foreground hover:border-foreground"
                  >
                    {archiveCopy.intake.submit}
                  </button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{archiveCopy.intake.helper}</p>
              </form>
            </PaperSheet>
          </div>

          <PaperSheet
            tone="flat"
            className="mt-10 grid gap-6 p-5 md:grid-cols-[0.88fr_1.12fr] md:items-center"
          >
            <div className="flex items-start gap-4">
              <ArchiveStamp>{archiveCopy.heat.title}</ArchiveStamp>
              <div>
                <p className="text-sm leading-6 text-muted-foreground">{archiveCopy.heat.body}</p>
                <Link
                  to="/about"
                  className="mt-2 inline-block text-xs uppercase tracking-wider underline-offset-4 hover:text-[var(--archive-pink)] hover:underline"
                >
                  {archiveCopy.heat.link}
                </Link>
              </div>
            </div>
            <HeatRuler value={heatValue ?? null} compact />
          </PaperSheet>
        </div>
      </section>

      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-serif text-3xl archive-marker">{archiveCopy.table.title}</h2>
            <Link
              to="/objects"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {archiveCopy.table.viewAll}
            </Link>
          </div>
          <LatestArchiveTable rows={archiveRows} />
        </div>
      </section>

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

function LatestArchiveTable({ rows }: { rows: any[] }) {
  const { t, objectType, tag, language } = useI18n();
  const archiveCopy = getArchiveHomeCopy(language);

  if (rows.length === 0) {
    return (
      <p className="mt-8 border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        {t("common.noObjects")}
      </p>
    );
  }

  return (
    <PaperSheet tone="flat" className="mt-7 overflow-x-auto p-0">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/70 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-normal">{archiveCopy.table.type}</th>
            <th className="px-4 py-3 font-normal">{archiveCopy.table.name}</th>
            <th className="px-4 py-3 font-normal">{archiveCopy.table.temperature}</th>
            <th className="px-4 py-3 font-normal">{archiveCopy.table.code}</th>
            <th className="px-4 py-3 font-normal">{archiveCopy.table.status}</th>
            <th className="px-4 py-3 font-normal">{archiveCopy.table.tags}</th>
            <th className="px-4 py-3" aria-label={t("objects.viewDetail")} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((o: any, index: number) => {
            const measured = (o.observation_count ?? 0) > 0;
            const tags = (o.top_tags ?? []).slice(0, 3);
            return (
              <tr key={o.id} className="group hover:bg-card/60">
                <td className="px-4 py-4">
                  <div className="font-medium">{objectType(o.type)}</div>
                </td>
                <td className="px-4 py-4">
                  <Link
                    to="/objects/$id"
                    params={{ id: o.id }}
                    className="font-serif text-lg underline-offset-4 group-hover:text-[var(--archive-pink)] group-hover:underline"
                  >
                    {o.name}
                  </Link>
                  {o.ai_summary && (
                    <div className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                      {o.ai_summary}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <MiniHeat value={measured ? o.temperature : null} />
                </td>
                <td className="px-4 py-4 font-mono text-xs">{archiveCode(o.id, index)}</td>
                <td className="px-4 py-4">
                  <ArchiveStamp className={cn(!measured && "text-muted-foreground")}>
                    {measured ? archiveCopy.table.recorded : archiveCopy.table.pending}
                  </ArchiveStamp>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length > 0 ? (
                      tags.map((tagItem: any) => (
                        <span
                          key={tagItem.tag}
                          className="border border-border px-2 py-0.5 text-[11px]"
                        >
                          {tag(tagItem.tag)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    to="/objects/$id"
                    params={{ id: o.id }}
                    className="text-xl leading-none hover:text-[var(--archive-pink)]"
                    aria-label={`${t("objects.viewDetail")}: ${o.name}`}
                  >
                    →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </PaperSheet>
  );
}

function archiveCode(id: string, index: number) {
  const suffix = id?.replace(/-/g, "").slice(0, 4).toUpperCase() || String(421 + index);
  return `FF-2026-${suffix}`;
}

function MiniHeat({ value }: { value: number | null }) {
  const measured = typeof value === "number";
  const pct = measured ? ((Math.max(20, Math.min(100, value)) - 20) / 80) * 100 : 0;
  return (
    <div className="min-w-[140px]">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-base tabular-nums">
          {measured ? value.toFixed(0) : "—"}
          {measured && <span className="text-xs text-muted-foreground">°C</span>}
        </span>
      </div>
      <div className="mt-1 h-2 border border-border bg-muted">
        <div
          className="h-full bg-[var(--archive-pink)]"
          style={{ width: `${measured ? pct : 0}%` }}
        />
      </div>
    </div>
  );
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
    <PaperSheet tone="flat" className="p-5">
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
                <MiniHeat value={o.temperature} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {objectType(o.type)}
                  </div>
                  <div className="truncate font-serif">{o.name}</div>
                </div>
                <span
                  className={`font-mono text-sm tabular-nums ${positive ? "archive-highlight" : "text-muted-foreground"}`}
                >
                  {o.delta_7d > 0 ? "+" : ""}
                  {o.delta_7d}°C
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PaperSheet>
  );
}

function getArchiveHomeCopy(language: "zh" | "en") {
  if (language === "en") {
    return {
      hero: {
        before: "If it feels wrong, ",
        accent: "record it",
        after: ".",
        body: "Record the experiences that are too often dismissed, so change has something to stand on. This is not a ranking board or a judgment seat; it is a public archive of women's experiences.",
        actions: "Submit text records, add source links, and keep observing changes.",
      },
      intake: {
        title: "Submit your experience record",
        code: "Archive No.: FF-2026-____",
        types: "Record type",
        bodyPlaceholder: "What happened? Specific details help drive change.",
        source: "Source link (optional)",
        sourcePlaceholder: "Public article, page, original text...",
        rules: "Read recording guidelines",
        submit: "Submit record",
        helper: "No link is required. You can add one later.",
      },
      heat: {
        title: "High heat warning",
        body: "Higher temperature means uncomfortable experiences are more concentrated; evidence level affects archive weight.",
        link: "How temperature is evaluated",
      },
      table: {
        title: "Latest files",
        viewAll: "View all files",
        type: "Object type",
        name: "Object name",
        temperature: "Temperature",
        code: "Archive No.",
        status: "Status",
        tags: "Tags",
        recorded: "Recorded",
        pending: "Needs detail",
      },
    };
  }

  return {
    hero: {
      before: "不舒服，",
      accent: "就记录",
      after: "。",
      body: "记录每一次不被尊重的体验，让改变有据可依。这里不是打分榜，也不是审判席，它更像一份公开的女性经验档案。",
      actions: "提交文字记录、补充来源链接、持续观察变化。",
    },
    intake: {
      title: "提交你的体验记录",
      code: "档案编号：FF-2026-____",
      types: "记录类型",
      bodyPlaceholder: "发生了什么？越具体越有助于推动改变。",
      source: "来源链接（可选）",
      sourcePlaceholder: "公开报道、网页、原文链接…",
      rules: "了解记录规范",
      submit: "提交记录",
      helper: "没有链接也可以记录，后续可补充。",
    },
    heat: {
      title: "高温警告",
      body: "温度越高，代表女性不适体验越集中；证据等级会影响归档权重。",
      link: "了解温度如何评定",
    },
    table: {
      title: "最新档案",
      viewAll: "查看全部档案",
      type: "对象类型",
      name: "对象名称",
      temperature: "温度",
      code: "档案编号",
      status: "状态",
      tags: "标签",
      recorded: "已记录",
      pending: "待补充",
    },
  };
}
