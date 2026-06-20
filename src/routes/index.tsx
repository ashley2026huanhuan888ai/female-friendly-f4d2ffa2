import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { FollowButton } from "@/components/FollowButton";
import { ArchiveStamp, PaperSheet, PaperStack } from "@/components/archive-ui";
import { getHomeSummary } from "@/lib/api/observation-center.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";
import { bandOf, FEMINIST_TAGS } from "@/lib/temperature";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-context";
import { pushHomeInteractionEvent } from "@/lib/interaction-tracker";
import { submitObservation } from "@/lib/api/platform.functions";
import { toast } from "sonner";
import mobileHeroAsset from "@/assets/mobile-hero-clean.webp.asset.json";
const mobileHeroUrl = mobileHeroAsset.url;

const HOME_DRAFT_KEY = "home-submit-draft";

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
  const { t, objectType, tag: tagLabel, language, dateLocale } = useI18n();
  usePageMeta("seo.home.title", "seo.home.description");
  const [summary, setSummary] = useState<any>(null);
  const fetchSummary = useServerFn(getHomeSummary);
  const archiveCopy = getArchiveHomeCopy(language);
  const archiveRows = (summary?.newest_objects ?? []).slice(0, 5);

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

  const latestObservations = (summary?.latest_observations ?? []) as any[];
  const newestObjects = (summary?.newest_objects ?? []) as any[];
  const submitDataReady = summary !== null;
  const featuredObservation =
    latestObservations.find((item) => item.object) ?? latestObservations[0] ?? null;
  const featuredObject =
    featuredObservation?.object ??
    newestObjects.find((item) => (item.observation_count ?? 0) > 0) ??
    newestObjects[0] ??
    null;
  const submitObjectOptions = buildHomeSubmitOptions(featuredObject, newestObjects);
  const featuredTemperature =
    typeof featuredObject?.temperature === "number" ? Number(featuredObject.temperature) : null;
  const featuredEvidence = featuredObservation?.evidence_level ?? null;
  const featuredCaseCode =
    featuredObservation?.case_code ??
    archiveCode(featuredObject?.id ?? featuredObservation?.id ?? "", 0);
  const featuredTags = getFeaturedTags(featuredObject, featuredObservation, summary);
  const extraTag = featuredTags.find((item) => !FEMINIST_TAGS.includes(item));
  const featuredDate =
    featuredObservation?.created_at ??
    featuredObject?.updated_at ??
    featuredObject?.created_at ??
    null;
  const observationCount = Number(featuredObject?.observation_count ?? 0);
  const sourceStatus = featuredObservation?.reference_url ? "已提供来源链接" : "待补充来源";
  const sourceValue = featuredObservation?.reference_url
    ? formatUrl(featuredObservation.reference_url)
    : sourceStatus;
  const verdict = getTemperatureVerdict(featuredTemperature);
  const axisPosition = getAxisPosition(featuredTemperature, featuredEvidence);
  const axisStyle = {
    "--case-temp-x": `${axisPosition.x}%`,
    "--case-evidence-y": `${axisPosition.y}%`,
  } as CSSProperties;
  const credibility = getCredibility(featuredEvidence, Boolean(featuredObservation?.reference_url));
  const summaryText =
    featuredObject?.ai_summary ??
    featuredObservation?.summary ??
    featuredObservation?.cleaned_content ??
    "暂无足够观察生成总结。";
  const evidenceRows = buildHomeEvidenceRows({
    object: featuredObject,
    observation: featuredObservation,
    tags: featuredTags,
    evidenceLevel: featuredEvidence,
    dateLocale,
  });
  const timelineRows = buildHomeTimelineRows(latestObservations, dateLocale);

  return (
    <SiteLayout variant="desk">
      <EditorialArchiveFirstPage
        featuredObject={featuredObject}
        featuredTemperature={featuredTemperature}
        totalObjects={summary?.total_objects ?? archiveRows.length}
        verdict={verdict}
        source="hero"
        submitObjectOptions={submitObjectOptions}
        submitDataReady={submitDataReady}
      />

      <HomeStartPanel
        featuredObject={featuredObject}
        latestObservationCount={latestObservations.length}
        totalObjects={summary?.total_objects ?? archiveRows.length}
        source="startPanel"
        submitObjectOptions={submitObjectOptions}
        submitDataReady={submitDataReady}
      />

      <section className="home-desk-hero home-case-hero border-b border-black/20">
        <div className="home-case-stage mx-auto max-w-[1540px] px-4 pb-10 pt-24 md:px-8 md:pb-14">
          <div className="home-case-board" aria-label="首页第一屏档案视觉">
            <aside className="case-paper case-paper-left">
              <div className="case-kicker">对象身份 / OBJECT IDENTITY</div>
              <div className="case-rule" />
              <div className="case-label">记录标题</div>
              <h1 className="case-object-title">{featuredObject?.name ?? "暂无公开档案"}</h1>
              <div className="case-pink-line" />

              <dl className="case-field-list">
                <div>
                  <dt>类型</dt>
                  <dd>{featuredObject ? objectType(featuredObject.type) : "待补充"}</dd>
                </div>
                <div>
                  <dt>对象名称</dt>
                  <dd>{featuredObject?.name ?? "暂无公开对象"}</dd>
                </div>
                <div>
                  <dt>当前温度</dt>
                  <dd>
                    {featuredTemperature === null
                      ? "暂无温度"
                      : `${featuredTemperature.toFixed(0)}°C`}
                  </dd>
                </div>
                <div>
                  <dt>观察数量</dt>
                  <dd>{observationCount > 0 ? `${observationCount} 条` : "暂无已审核观察"}</dd>
                </div>
                <div>
                  <dt>最近记录</dt>
                  <dd>{formatDateTime(featuredDate, dateLocale)}</dd>
                </div>
                <div>
                  <dt>发生场景</dt>
                  <dd>{featuredObservation?.scene || "由公开观察记录整理"}</dd>
                </div>
                <div>
                  <dt>来源链接</dt>
                  <dd>{sourceValue}</dd>
                </div>
                <div>
                  <dt>档案编号</dt>
                  <dd>{featuredCaseCode}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>
                    <span className="case-dot" />
                    {featuredObservation || observationCount > 0 ? "已记录" : "待补充"}
                  </dd>
                </div>
                <div>
                  <dt>记录者</dt>
                  <dd>匿名用户 / 公开记录</dd>
                </div>
              </dl>

              <section className="case-section">
                <h2>标签 / TAGS</h2>
                <div className="case-tags">
                  {featuredTags.length > 0 ? (
                    featuredTags
                      .slice(0, 6)
                      .map((label) => <span key={label}>{tagLabel(label)}</span>)
                  ) : (
                    <span>待补充标签</span>
                  )}
                </div>
              </section>

              <section className="case-section case-evidence-level">
                <h2>证据等级 / EVIDENCE LEVEL</h2>
                <div>
                  <strong>{featuredEvidence ? `${featuredEvidence} 级证据` : "证据待补充"}</strong>
                  <span className="case-stars">{credibility.stars}</span>
                </div>
                <p>{credibility.description}</p>
              </section>
              <ArchiveStamp className="archive-stamp-soft case-recorded-stamp rotate-[-7deg]">
                {featuredObservation || observationCount > 0 ? "已记录" : "待补充"}
              </ArchiveStamp>
            </aside>

            <main className="case-paper case-paper-main">
              <header className="case-main-header">
                <div>
                  <div className="case-kicker">
                    温度 × 证据双轴诊断 / TEMPERATURE × EVIDENCE AXIS
                  </div>
                  <div className="case-rule" />
                </div>
                <div className="case-file-no">档案编号：{featuredCaseCode}</div>
              </header>

              <section className="case-diagnosis-grid">
                <div className="case-axis-card">
                  <div className="case-axis-y-label">证据强度</div>
                  <div className="case-axis-chart" style={axisStyle}>
                    <div className="case-axis-y">
                      <span>
                        A级
                        <br />
                        强证据
                      </span>
                      <span>
                        B级
                        <br />
                        充分证据
                      </span>
                      <span>
                        C级
                        <br />
                        一般证据
                      </span>
                      <span>
                        D级
                        <br />
                        较弱证据
                      </span>
                    </div>
                    <div className="case-axis-x">
                      <span>
                        0°C
                        <br />
                        低温
                      </span>
                      <span>
                        25°C
                        <br />
                        偏低
                      </span>
                      <span>
                        50°C
                        <br />
                        升温
                      </span>
                      <span>
                        75°C
                        <br />
                        高温
                      </span>
                      <span>
                        100°C
                        <br />
                        烫伤级避雷
                      </span>
                    </div>
                    <div className="case-axis-cross case-axis-cross-x" />
                    <div className="case-axis-cross case-axis-cross-y" />
                    <div className="case-axis-point" />
                    <div className="case-axis-note">
                      {verdict.shortLabel} · {featuredEvidence ?? "待补充"} 级证据
                      <br />
                      {credibility.status}
                    </div>
                  </div>
                  <div className="case-axis-x-label">女性友好温度</div>
                </div>

                <div className="case-verdict">
                  <div>
                    当前判定：<strong>{verdict.label}</strong>
                  </div>
                  <p>
                    证据状态：{credibility.status}，{sourceStatus}。
                  </p>
                  <div className="case-temp-score">
                    温度得分：
                    <strong>
                      {featuredTemperature === null ? "—" : `${featuredTemperature.toFixed(0)}°C`}
                    </strong>
                  </div>
                  <div>证据等级：{featuredEvidence ?? "待补充"}</div>
                </div>
              </section>

              <section className="case-section case-ai-summary">
                <h2>AI 摘要 / AI SUMMARY</h2>
                <p>{truncateText(summaryText, "暂无足够观察生成总结。", 220)}</p>
              </section>

              <section className="case-section">
                <h2>文字证据摘录 / TEXT EVIDENCE</h2>
                <div className="case-table">
                  <div className="case-table-head">类型</div>
                  <div className="case-table-head">内容</div>
                  <div className="case-table-head">来源链接状态 / 时间</div>
                  <div className="case-table-head">备注</div>
                  {evidenceRows.map((row) => (
                    <HomeEvidenceRow key={row.type} row={row} />
                  ))}
                </div>
              </section>

              <div className="case-bottom-grid">
                <section className="case-section case-timeline">
                  <h2>事件时间线 / TIMELINE</h2>
                  <ul>
                    {timelineRows.map((row) => (
                      <li key={`${row.time}-${row.text}`}>
                        <span>{row.time}</span>
                        {row.text}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="case-review-note">
                  <h2>审核员备注 / REVIEW NOTES</h2>
                  <p>{credibility.reviewNote}</p>
                  <div>系统复核 · {formatDateTime(featuredDate, dateLocale)}</div>
                </section>
              </div>
            </main>

            <aside className="case-paper case-paper-right">
              <section className="case-section case-credibility">
                <h2>来源可信度 / SOURCE CREDIBILITY</h2>
                <div className="case-stars-large">{credibility.stars}</div>
                <strong>{credibility.label}</strong>
                <p>综合评估记录内容的具体性、时间、地点与可验证程度。</p>
                <Link to="/about">了解可信度等级说明 →</Link>
              </section>

              <section className="case-section">
                <h2>触发点 / TRIGGER TAXONOMY</h2>
                <div className="case-checklist">
                  {FEMINIST_TAGS.slice(0, 8).map((label) => (
                    <label key={label}>
                      <input type="checkbox" checked={featuredTags.includes(label)} readOnly />
                      <span>{tagLabel(label)}</span>
                    </label>
                  ))}
                  <label>
                    <input type="checkbox" readOnly />
                    <span>其他</span>
                    <span className="case-other-input">
                      {extraTag ? tagLabel(extraTag) : "请描述具体内容"}
                    </span>
                  </label>
                </div>
              </section>

              <section className="case-section case-follow">
                <h2>关注此档案 / FOLLOW</h2>
                <div>
                  <span>
                    {observationCount > 0 ? `${observationCount} 条观察` : "等待第一条观察"}
                  </span>
                  {featuredObject ? (
                    <FollowButton objectId={featuredObject.id} />
                  ) : (
                    <Link to="/request-object" className="case-inline-action">
                      申请对象
                    </Link>
                  )}
                </div>
              </section>

              <section className="case-section case-actions">
                <h2>行动 / ACTIONS</h2>
                {featuredObject ? (
                  <Link to="/submit/$objectId" params={{ objectId: featuredObject.id }}>
                    补充我的记录
                  </Link>
                ) : (
                  <Link to="/objects">浏览对象库</Link>
                )}
                {featuredObject ? (
                  <Link to="/objects/$id" params={{ id: featuredObject.id }}>
                    查看档案详情
                  </Link>
                ) : (
                  <Link to="/objects">查看全部档案</Link>
                )}
                <Link to="/feedback">举报此记录</Link>
              </section>
              <ArchiveStamp className="archive-stamp-soft case-source-stamp rotate-[-9deg]">
                {sourceStatus}
              </ArchiveStamp>
            </aside>
          </div>
          <p className="case-footer-note">每一条反馈，都是女性经验的一次存档。</p>
        </div>
      </section>

      <section className="archive-desk border-b border-border py-14">
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

      <section className="archive-desk border-b border-border py-16">
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

      <section className="archive-desk border-b border-border py-16">
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
            <PaperSheet tone="slip" className="mt-10 p-8 text-center">
              <p className="text-sm text-muted-foreground">{t("home.noEvents24h")}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link to="/objects" className="paper-action-secondary px-4 py-2 text-xs">
                  浏览对象库
                </Link>
                <Link to="/request-object" className="paper-action px-4 py-2 text-xs">
                  申请新对象
                </Link>
              </div>
            </PaperSheet>
          ) : (
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {summary.today_events.map((e: any, i: number) => (
                <FeedEventCard key={i} ev={{ ...e, id: String(i) }} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="archive-desk border-b border-border py-16">
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
            <PaperSheet tone="slip" className="mt-6 p-6">
              <p className="text-sm text-muted-foreground">{t("common.noObservations")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/objects" className="paper-action-secondary px-4 py-2 text-xs">
                  找到对象并提交
                </Link>
                <Link to="/request-object" className="paper-action px-4 py-2 text-xs">
                  申请新测评对象
                </Link>
              </div>
            </PaperSheet>
          )}
        </div>
      </section>

      <section className="archive-desk py-12">
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
              className="archive-paper block border border-border bg-card/60 p-4 text-sm hover:border-foreground/40"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("home.knowledgeTitle")}
              </div>
              <div className="mt-1 font-serif">{t("home.knowledgeBody")}</div>
            </Link>
            <Link
              to="/topics"
              className="archive-paper block border border-border bg-card/60 p-4 text-sm hover:border-foreground/40"
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

function HomeStartPanel({
  featuredObject,
  latestObservationCount,
  totalObjects,
  submitObjectOptions,
  submitDataReady,
  source,
}: {
  featuredObject: any;
  latestObservationCount: number;
  totalObjects: number;
  submitObjectOptions: HomeSubmitObjectOption[];
  submitDataReady: boolean;
  source: string;
}) {
  return (
    <section className="archive-desk border-b border-border py-10">
      <div className="container-prose">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Start Here
            </div>
            <h2 className="mt-2 font-serif text-3xl">你可以从这里开始</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            当前公开对象 {totalObjects} 个 · 最新观察 {latestObservationCount} 条
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <PaperSheet tone="dossier" className="p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              01 / Find
            </div>
            <h3 className="mt-2 font-serif text-2xl">先找测评对象</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              搜索品牌、产品、影视、服务或组织，查看已有温度和公开观察。
            </p>
            <Link
              to="/objects"
              className="paper-action-secondary mt-5 inline-block px-4 py-2 text-xs"
            >
              浏览对象库
            </Link>
          </PaperSheet>

          <PaperSheet tone="slip" className="p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              02 / Record
            </div>
            <h3 className="mt-2 font-serif text-2xl">提交体验记录</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              补充文字记录和来源链接，AI 会生成标签、证据等级和温度影响。
            </p>
            <HomeSubmitQuickAction
              options={submitObjectOptions}
              submitDataReady={submitDataReady}
              compact
              source={source}
              buttonLabel="开始提交体验"
              helperText="选择对象后直接进入提交页，未登录会先去登录。"
            />
          </PaperSheet>

          <PaperSheet tone="flat" className="p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              03 / Follow
            </div>
            <h3 className="mt-2 font-serif text-2xl">看见变化</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              查看最近升温、降温、审核通过的观察，以及知识库中的参考案例。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/feed" className="paper-action-secondary px-4 py-2 text-xs">
                观察动态
              </Link>
              <Link to="/knowledge" className="paper-action-secondary px-4 py-2 text-xs">
                知识库
              </Link>
            </div>
          </PaperSheet>
        </div>
      </div>
    </section>
  );
}

function EditorialArchiveFirstPage({
  featuredObject,
  featuredTemperature,
  totalObjects,
  verdict,
  submitObjectOptions,
  submitDataReady,
  source,
}: {
  featuredObject: any;
  featuredTemperature: number | null;
  totalObjects: number;
  verdict: { label: string; shortLabel: string };
  submitObjectOptions: HomeSubmitObjectOption[];
  submitDataReady: boolean;
  source: string;
}) {
  const hasMeasuredObject = typeof featuredTemperature === "number";
  const displayTemperature = hasMeasuredObject ? featuredTemperature : 0;
  const temperaturePosition = hasMeasuredObject
    ? `${Math.max(4, Math.min(96, displayTemperature))}%`
    : "8%";
  const statistic = totalObjects > 0 ? totalObjects.toLocaleString("zh-CN") : "0";

  return (
    <section className="archive-editorial-first" aria-label="女性友好体验监测站首页首屏">
      <Link to="/request-object" className="block">
        <img
          src={mobileHeroUrl}
          alt="不舒服，就记录 - 女性友好体验监测站"
          className="archive-editorial-mobile-hero"
          fetchPriority="high"
          decoding="async"
          width={780}
        />

      </Link>
      <div className="archive-editorial-scene">
        <div className="archive-editorial-underlay archive-editorial-underlay-a" />
        <div className="archive-editorial-underlay archive-editorial-underlay-b" />
        <div className="archive-editorial-underlay archive-editorial-grid-paper" />

        <aside className="archive-editorial-sheet archive-editorial-hero-sheet">
          <h1>
            不舒服，
            <br />
            就记录。
          </h1>
          <span className="archive-editorial-brush" />
          <p>记录每一次被尊重的体验，让改变有据可依。</p>
          <p className="archive-editorial-purpose-note">
            这是一个收集女性体验观察的平台。下一步：搜索你关心的对象，或直接提交一条体验记录。
          </p>
          {featuredObject ? (
            <Link
              to="/submit/$objectId"
              params={{ objectId: featuredObject.id }}
              className="archive-editorial-cta"
            >
              提交你的体验记录 <span>→</span>
            </Link>
          ) : (
            <Link to="/request-object" className="archive-editorial-cta">
              申请新测评对象 <span>→</span>
            </Link>
          )}
          <div className="archive-editorial-quick-actions" aria-label="首页快捷入口">
            <Link to="/objects">浏览对象库</Link>
            <Link to="/request-object">申请对象</Link>
            <Link to="/feed">观察动态</Link>
          </div>
          <div className="archive-editorial-stat-card">
            <span aria-hidden>▤</span>
            <div>
              <strong>最新档案</strong>
              <b>{statistic}</b>
              <small>来自真实女性的体验记录</small>
              <small>不做事实认定，也不做道德审判。</small>
              <small>提交文字记录，补充来源链接，持续观察变化。</small>
            </div>
          </div>
        </aside>

        <main className="archive-editorial-sheet archive-editorial-record-sheet">
          <header>
            <div>
              <h2>女性友好体验监测站</h2>
              <p>Female-Friendly Experience Archive</p>
            </div>
          </header>
          <section>
            <h3>档案简介</h3>
            <p>
              本档案用于收集、记录和观察在品牌、影视、服务、产品、空间等场景中，影响女性体验的细节与感受，作为推动改变的长期依据。
            </p>
          </section>
          <EditorialCheckGrid
            title="触发点（可多选）"
            checked={["物化女性", "身材羞辱", "消费女性议题"]}
            items={[
              "物化女性",
              "身材羞辱",
              "消费女性议题",
              "性别刻板印象",
              "服务冒犯",
              "辱段子 / 低俗内容",
              "年龄羞辱",
              "其他",
            ]}
            columns
          />
          <footer>每一条反馈，都是女性经验的一次存档。</footer>
        </main>

        <aside className="archive-editorial-sheet archive-editorial-submit-sheet">
          <header>
            <h2>提交你的体验记录</h2>
            
          </header>
          <EditorialCheckGrid
            title="记录类型"
            checked={[]}
            items={[
              "品牌",
              "影视作品",
              "服务体验",
              "游戏",
              "活动 / 组织",
              "公共事件",
              "企业组织",
              "其他",
            ]}
          />
          <section>
            <h3>你的体验记录</h3>
            <div className="archive-editorial-writing-area">
              <p>可以按这个框架写：</p>
              <p>1. 场景：在哪里、何时看到或经历？</p>
              <p>2. 细节：具体对话、画面、规则或互动是什么？</p>
              <p>3. 影响：让谁受到影响，带来什么感受？</p>
              <p>4. 依据：链接、截图、出处或补充说明。</p>
            </div>
          </section>
          <div className="archive-editorial-submit-footer">
            <HomeSubmitQuickAction
              options={submitObjectOptions}
              submitDataReady={submitDataReady}
              source={source}
              buttonLabel="提交体验记录"
              helperText="先选对象，再跳转到对象提交页。"
            />
          </div>
        </aside>

        <section className="archive-editorial-sheet archive-editorial-temperature-card">
          <span className="archive-editorial-thermometer" aria-hidden />
          <div className="archive-editorial-temperature-number">
            <h3>{hasMeasuredObject ? verdict.label : "等待记录"}</h3>
            <strong>{hasMeasuredObject ? `${displayTemperature.toFixed(0)}°C` : "—°C"}</strong>
            <small>当前温度</small>
          </div>
          <div className="archive-editorial-scale">
            <div className="archive-editorial-scale-labels">
              <span>低温</span>
              <span>升温</span>
              <span>高温</span>
              <span>烫伤级避雷</span>
            </div>
            <div className="archive-editorial-scale-bar">
              <i style={{ left: temperaturePosition }} />
            </div>
            <div className="archive-editorial-scale-ranges">
              <span>0°C-35°C</span>
              <span>36°C-60°C</span>
              <span>61°C-80°C</span>
              <span>81°C-100°C</span>
            </div>
          </div>
          <div className="archive-editorial-warning-copy">
            <ArchiveStamp className="archive-stamp-soft">
              {hasMeasuredObject ? verdict.shortLabel : "待补充"}
            </ArchiveStamp>
            <p>
              {hasMeasuredObject
                ? `${verdict.label}，建议谨慎选择或继续补充观察。`
                : "还没有可展示的公开档案，先申请对象或浏览对象库。"}
            </p>
          </div>
          <span className="archive-editorial-corner-clip" aria-hidden />
        </section>
      </div>
    </section>
  );
}

function EditorialCheckGrid({
  title,
  items,
  checked,
  columns,
}: {
  title: string;
  items: string[];
  checked: string[];
  columns?: boolean;
}) {
  return (
    <section>
      <h3>{title}</h3>
      <div className={cn("archive-editorial-check-grid", columns && "is-two-column")}>
        {items.map((item) => (
          <label key={item}>
            <input type="checkbox" checked={checked.includes(item)} readOnly />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

type HomeEvidenceRowModel = {
  type: string;
  content: string;
  source: string;
  note: string;
};

type HomeSubmitObjectOption = {
  id: string;
  name: string;
};

function buildHomeSubmitOptions(
  featuredObject: any,
  newestObjects: any[],
): HomeSubmitObjectOption[] {
  const rawOptions = [
    featuredObject?.id
      ? {
          id: String(featuredObject.id),
          name: String(featuredObject.name || "未命名对象"),
        }
      : null,
    ...(newestObjects ?? []),
  ].filter(Boolean) as Array<{ id: string; name: string }>;

  const options: HomeSubmitObjectOption[] = [];
  const used = new Set<string>();

  for (const item of rawOptions) {
    const id = String(item.id ?? "");
    if (!id || used.has(id)) continue;
    options.push({ id, name: String(item.name || "未命名对象") });
    used.add(id);
    if (options.length >= 8) break;
  }
  return options;
}

function HomeSubmitQuickAction({
  options,
  submitDataReady,
  compact = false,
  source,
  buttonLabel,
  helperText,
}: {
  options: HomeSubmitObjectOption[];
  compact?: boolean;
  submitDataReady: boolean;
  source: string;
  buttonLabel: string;
  helperText?: string;
}) {
  const navigate = useNavigate();
  const { ready: authReady, user } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedObjectId, setSelectedObjectId] = useState(options[0]?.id ?? "");
  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const visibleOptions = normalizedKeyword
    ? options.filter((option) => option.name.toLowerCase().includes(normalizedKeyword))
    : options;
  

  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [lastSearchValue, setLastSearchValue] = useState("");
  const [hasTrackedEmptyOptions, setHasTrackedEmptyOptions] = useState(false);

  useEffect(() => {
    if (!submitDataReady || hasTrackedImpression) return;

    pushHomeInteractionEvent("home_submit_widget_impression", {
      source,
      option_count: options.length,
      has_featured: Boolean(options.length),
    });
    setHasTrackedImpression(true);
  }, [options.length, source, hasTrackedImpression, submitDataReady]);

  useEffect(() => {
    if (!submitDataReady || options.length || hasTrackedEmptyOptions) return;

    pushHomeInteractionEvent("home_submit_empty_options", {
      source,
      has_featured: false,
    });
    setHasTrackedEmptyOptions(true);
  }, [submitDataReady, options.length, source, hasTrackedEmptyOptions]);

  useEffect(() => {
    if (!options.length) {
      setSelectedObjectId("");
      return;
    }
    if (!visibleOptions.length) {
      setSelectedObjectId("");
      return;
    }
    if (!visibleOptions.some((option) => option.id === selectedObjectId)) {
      setSelectedObjectId(visibleOptions[0].id);
    }
  }, [options, visibleOptions, selectedObjectId]);

  useEffect(() => {
    if (!submitDataReady) return;
    if (!visibleOptions.length) return;
    const keyword = searchKeyword.trim();
    if (!keyword || keyword === lastSearchValue) return;

    const timer = setTimeout(() => {
      pushHomeInteractionEvent("home_submit_search", {
        source,
        keyword_len: keyword.length,
        result_count: visibleOptions.length,
      });
      setLastSearchValue(keyword);
    }, 280);

    return () => clearTimeout(timer);
  }, [
    lastSearchValue,
    normalizedKeyword,
    source,
    visibleOptions.length,
    searchKeyword,
    submitDataReady,
  ]);

  const [content, setContent] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "submitting" | "done">("idle");
  const [successObjectId, setSuccessObjectId] = useState<string>("");
  const submitFn = useServerFn(submitObservation);

  // Restore draft once options are ready
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (draftRestored || !options.length) return;
    try {
      const raw = localStorage.getItem(HOME_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.content) setContent(String(d.content));
        if (d?.reference_url) setReferenceUrl(String(d.reference_url));
        if (d?.object_id && options.some((o) => o.id === d.object_id)) {
          setSelectedObjectId(d.object_id);
        }
      }
    } catch {
      /* ignore */
    }
    setDraftRestored(true);
  }, [options, draftRestored]);

  // Auto-save draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (content || referenceUrl || selectedObjectId) {
          localStorage.setItem(
            HOME_DRAFT_KEY,
            JSON.stringify({
              object_id: selectedObjectId,
              content,
              reference_url: referenceUrl,
            }),
          );
        }
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [content, referenceUrl, selectedObjectId]);

  const trimmedContent = content.trim();
  const contentLenOk = trimmedContent.length >= 10 && trimmedContent.length <= 2000;
  const urlOk =
    !referenceUrl.trim() ||
    (() => {
      try {
        new URL(referenceUrl.trim());
        return referenceUrl.trim().length <= 500;
      } catch {
        return false;
      }
    })();
  const canSubmit =
    Boolean(selectedObjectId) && contentLenOk && urlOk && phase === "idle";

  const targetRedirect = "/";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedObjectId || !contentLenOk || !urlOk) return;

    if (!user) {
      pushHomeInteractionEvent("home_submit_blocked_login", {
        source,
        object_id: selectedObjectId,
        has_search_keyword: Boolean(searchKeyword.trim()),
        result_count: visibleOptions.length,
      });
      navigate({ to: "/login", search: { redirect: targetRedirect } });
      return;
    }

    pushHomeInteractionEvent("home_submit_start", {
      source,
      object_id: selectedObjectId,
      has_search_keyword: Boolean(searchKeyword.trim()),
      visible_count: visibleOptions.length,
      matched_count: visibleOptions.length,
      is_logged_in: true,
      from_login_redirect: false,
    });

    setPhase("submitting");
    try {
      await submitFn({
        data: {
          object_id: selectedObjectId,
          content: trimmedContent,
          scene: null,
          reference_url: referenceUrl.trim() || null,
        },
      });
      pushHomeInteractionEvent("home_submit_success", {
        source,
        object_id: selectedObjectId,
      });
      try {
        localStorage.removeItem(HOME_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setSuccessObjectId(selectedObjectId);
      setContent("");
      setReferenceUrl("");
      setPhase("done");
      toast.success("已记录你的观察，AI 正在分析");
    } catch (err: any) {
      pushHomeInteractionEvent("home_submit_error", {
        source,
        object_id: selectedObjectId,
        message: String(err?.message ?? err).slice(0, 200),
      });
      toast.error(String(err?.message ?? "提交失败，请稍后重试"));
      setPhase("idle");
    }
  };

  if (!submitDataReady) {
    return (
      <div className={compact ? "space-y-2" : "mt-4 space-y-2"}>
        <p className="text-xs text-muted-foreground">正在加载可提交对象...</p>
      </div>
    );
  }

  if (!options.length) {
    return (
      <div className={compact ? "space-y-2" : "mt-4 space-y-2"}>
        <p className="text-xs text-muted-foreground">
          暂无可直接提交的对象，先去对象库选择或申请。
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/objects" className="paper-action-secondary px-3 py-2 text-xs">
            浏览对象库
          </Link>
          <Link to="/request-object" className="paper-action-secondary px-3 py-2 text-xs">
            申请对象
          </Link>
        </div>
      </div>
    );
  }

  const selectedObjectName = options.find((option) => option.id === selectedObjectId)?.name;

  if (phase === "done" && successObjectId) {

    return (
      <div className={compact ? "mt-4 space-y-2" : "mt-5 space-y-2"}>
        <p className="text-xs text-muted-foreground">
          ✓ 已提交体验记录，AI 正在分析对象温度变化。
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/objects/$id"
            params={{ id: successObjectId }}
            className="paper-action-secondary px-3 py-2 text-xs"
          >
            查看对象页
          </Link>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setSuccessObjectId("");
            }}
            className="paper-action-secondary px-3 py-2 text-xs"
          >
            再写一条
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "mt-4 space-y-2" : "mt-5 space-y-2"}>
      <input
        type="text"
        value={searchKeyword}
        onChange={(event) => setSearchKeyword(event.target.value)}
        placeholder="快速搜索对象名称"
        className="paper-input w-full text-xs"
      />
      {!visibleOptions.length ? (
        <p className="text-xs text-muted-foreground">未找到匹配对象，尝试输入更少关键词。</p>
      ) : null}
      <select
        value={selectedObjectId}
        onChange={(event) => setSelectedObjectId(event.target.value)}
        className="paper-input w-full text-sm"
      >
        {visibleOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={
          selectedObjectName
            ? `写下你对「${selectedObjectName}」的体验（10–2000 字）`
            : "写下你的体验观察（10–2000 字）"
        }
        rows={4}
        maxLength={2000}
        className="paper-input w-full text-sm leading-relaxed"
      />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {trimmedContent.length}/2000
          {trimmedContent.length > 0 && trimmedContent.length < 10
            ? " · 至少 10 字"
            : ""}
        </span>
      </div>
      <input
        type="url"
        value={referenceUrl}
        onChange={(event) => setReferenceUrl(event.target.value)}
        placeholder="来源链接（可选，如新闻报道、官方公告）"
        className="paper-input w-full text-xs"
      />
      {!urlOk ? (
        <p className="text-[11px] text-destructive">来源链接格式不正确</p>
      ) : null}
      <button
        type="submit"
        disabled={!canSubmit && Boolean(user)}
        className={`paper-action inline-flex w-full items-center justify-center px-4 py-2 text-xs ${
          !canSubmit && user ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {phase === "submitting"
          ? "分析中…"
          : !user
            ? "登录后继续提交"
            : selectedObjectName
              ? `${buttonLabel}（${selectedObjectName}）`
              : buttonLabel}
      </button>
      {helperText ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{helperText}</p>
      ) : null}
      {!authReady ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">正在读取登录状态…</p>
      ) : user ? null : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          未登录将跳转至登录页，草稿会自动保留。
        </p>
      )}
    </form>
  );
}

function HomeEvidenceRow({ row }: { row: HomeEvidenceRowModel }) {
  return (
    <>
      <div>{row.type}</div>
      <div>{row.content}</div>
      <div>{row.source}</div>
      <div>{row.note}</div>
    </>
  );
}

function getFeaturedTags(object: any, observation: any, summary: any): string[] {
  const fromObject = Array.isArray(object?.top_tags)
    ? object.top_tags
        .map((item: any) => (typeof item === "string" ? item : item?.tag))
        .filter(Boolean)
    : [];
  const fromObservation = Array.isArray(observation?.tags) ? observation.tags.filter(Boolean) : [];
  const fromTrending = Array.isArray(summary?.trending_tags)
    ? summary.trending_tags.map((item: any) => item?.tag).filter(Boolean)
    : [];

  return [...new Set([...fromObservation, ...fromObject, ...fromTrending])].slice(0, 8);
}

function formatDateTime(value: string | null | undefined, locale = "zh-CN") {
  if (!value) return "暂无时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无时间";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.length > 34 ? `${value.slice(0, 34)}...` : value;
  }
}

function truncateText(value: string | null | undefined, fallback: string, length = 80) {
  const text = value?.trim() || fallback;
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function getTemperatureVerdict(value: number | null) {
  if (value === null) {
    return { label: "温度待补充", shortLabel: "暂无温度" };
  }

  const band = bandOf(value);
  const copy: Record<string, { label: string; shortLabel: string }> = {
    comfort: { label: "低温观察", shortLabel: "低温" },
    minor: { label: "轻微升温", shortLabel: "偏低" },
    notable: { label: "明显升温", shortLabel: "升温" },
    high: { label: "高温警告", shortLabel: "高温" },
    critical: { label: "烫伤级避雷", shortLabel: "烫伤级避雷" },
  };
  return copy[band.band] ?? { label: band.label, shortLabel: band.label };
}

function getAxisPosition(temperature: number | null, evidenceLevel: string | null) {
  const x = temperature === null ? 18 : Math.max(4, Math.min(96, temperature));
  const evidenceY: Record<string, number> = {
    A: 14,
    B: 39,
    C: 63,
    D: 84,
  };
  return {
    x,
    y: evidenceY[evidenceLevel ?? ""] ?? 70,
  };
}

function getCredibility(evidenceLevel: string | null, hasSource: boolean) {
  const starsByLevel: Record<string, string> = {
    A: "★★★★★",
    B: "★★★★☆",
    C: "★★★☆☆",
    D: "★★☆☆☆",
  };
  const labelByLevel: Record<string, string> = {
    A: "很高",
    B: "较高",
    C: "中等",
    D: "较低",
  };
  const statusByLevel: Record<string, string> = {
    A: "多源证据充分",
    B: "文字记录充分",
    C: "记录仍需补强",
    D: "证据较弱",
  };
  const level = evidenceLevel ?? "";
  const status = statusByLevel[level] ?? "证据待补充";
  const sourceCopy = hasSource ? "已包含可追溯来源。" : "公开来源仍可继续补充。";

  return {
    stars: starsByLevel[level] ?? "☆☆☆☆☆",
    label: labelByLevel[level] ?? "待评估",
    status,
    description: `${status}，${sourceCopy}`,
    reviewNote: `${status}。建议继续补充原始链接、截图文字或更多观察记录，以提高档案可信度。`,
  };
}

function buildHomeEvidenceRows({
  object,
  observation,
  tags,
  evidenceLevel,
  dateLocale,
}: {
  object: any;
  observation: any;
  tags: string[];
  evidenceLevel: string | null;
  dateLocale: string;
}): HomeEvidenceRowModel[] {
  return [
    {
      type: "用户记录",
      content: truncateText(
        observation?.cleaned_content ?? observation?.content ?? observation?.summary,
        "暂无公开观察原文，等待补充记录。",
        72,
      ),
      source: formatDateTime(observation?.created_at, dateLocale),
      note: observation?.scene || "公开观察记录",
    },
    {
      type: "对象档案",
      content: object?.name
        ? `${object.name} 当前累计 ${object.observation_count ?? 0} 条观察。`
        : "暂无对象档案。",
      source: object?.type ? "对象库已收录" : "对象待补充",
      note: object?.temperature
        ? `当前温度 ${Number(object.temperature).toFixed(0)}°C`
        : "暂无温度",
    },
    {
      type: "触发标签",
      content: tags.length > 0 ? tags.slice(0, 5).join("、") : "暂无标签",
      source: tags.length > 0 ? "观察标签汇总" : "等待观察",
      note: evidenceLevel ? `${evidenceLevel} 级证据` : "证据待补充",
    },
    {
      type: "来源状态",
      content: observation?.reference_url
        ? formatUrl(observation.reference_url)
        : "暂无公开来源链接。",
      source: observation?.reference_url ? "已提供来源" : "待补充来源",
      note: observation?.reference_url ? "可继续补充多源材料" : "建议补充来源链接",
    },
  ];
}

function buildHomeTimelineRows(observations: any[], dateLocale: string) {
  if (!observations.length) {
    return [{ time: "暂无", text: "等待第一条已审核观察进入档案。" }];
  }

  return observations.slice(0, 4).map((observation) => ({
    time: formatDateTime(observation.created_at, dateLocale),
    text: truncateText(
      observation.summary ?? observation.cleaned_content ?? observation.content,
      "新增一条已审核观察。",
      52,
    ),
  }));
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
    <PaperStack className="mt-7">
      <PaperSheet tone="dossier" className="overflow-x-auto p-0">
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
    </PaperStack>
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
    <PaperSheet tone={positive ? "dossier" : "slip"} className="p-5">
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
        feeling: "My experience",
        bodyPlaceholder:
          "Use this structure if helpful:\n1. Context: where and when did you see it?\n2. Details: exact wording, scene, rule, or interaction.\n3. Impact: who was affected, and how did it feel?\n4. Evidence: link, source note, or original text.",
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
      feeling: "我的感受",
      bodyPlaceholder:
        "可以按这个框架写：\n1. 场景：在哪里、何时看到或经历？\n2. 细节：具体原话、画面、规则或互动是什么？\n3. 影响：让谁受到影响，带来什么感受？\n4. 依据：链接、出处或补充说明。",
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
