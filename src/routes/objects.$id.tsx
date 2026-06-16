import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import {
  ArchiveStamp,
  DossierPanel,
  PaperRows,
  PaperSheet,
  PaperStack,
  TemperatureVerdict,
} from "@/components/archive-ui";
import { ObjectTimeline } from "@/components/ObjectTimeline";
import { TemperatureBreakdown } from "@/components/TemperatureBreakdown";
import { HeatSources } from "@/components/HeatSources";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";
import { getTemperatureExplanation } from "@/lib/api/temperature.functions";
import { getPublicObjectDetail, getPublicObjectObservations } from "@/lib/api/platform.functions";
import { FollowButton } from "@/components/FollowButton";
import { ObjectComments } from "@/components/ObjectComments";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/objects/$id")({
  loader: async ({ params }) => {
    return getPublicObjectDetail({ data: { id: params.id } });
  },
  head: ({ loaderData, params }) => {
    const obj = (loaderData as any)?.object;
    const title = obj ? `${obj.name} · 女性友好体验测评` : "对象详情 · 女性友好体验测评";
    const description = obj
      ? obj.ai_summary || `查看 ${obj.name} 的女性友好温度与观察记录。`
      : "浏览对象的女性友好温度与观察记录。";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
      links: [{ rel: "canonical", href: `/objects/${params.id}` }],
    };
  },
  component: ObjectDetail,
  notFoundComponent: ObjectNotFound,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-prose py-20">{error.message}</div>
    </SiteLayout>
  ),
});

function ObjectNotFound() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <div className="container-prose py-32 text-center">
        <h1 className="font-serif text-3xl">{t("objectDetail.notFound")}</h1>
        <Link to="/objects" className="mt-4 inline-block text-sm underline">
          {t("common.backToObjects")}
        </Link>
      </div>
    </SiteLayout>
  );
}

function ObjectDetail() {
  const { language, t, objectType, tag } = useI18n();
  const { id } = Route.useParams();
  const [obj, setObj] = useState<any>(null);
  const [obs, setObs] = useState<any[]>([]);
  const [obsTotal, setObsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expl, setExpl] = useState<{ breakdown: any; object: any } | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const fetchExpl = useServerFn(getTemperatureExplanation);
  const fetchDetail = useServerFn(getPublicObjectDetail);
  const fetchMoreObservations = useServerFn(getPublicObjectObservations);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await fetchDetail({ data: { id } });
        if (cancelled) return;
        setObj(detail.object);
        setObs(detail.observations ?? []);
        setObsTotal(detail.observationTotal ?? 0);
        setLoading(false);
        if (detail.object)
          fetchExpl({ data: { object_id: id } })
            .then((d) => setExpl(d as never))
            .catch(() => {});
      } catch {
        if (cancelled) return;
        setObj(null);
        setObs([]);
        setObsTotal(0);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchExpl, fetchDetail]);

  async function loadMoreObservations() {
    if (loadingMore || obs.length >= obsTotal) return;
    setLoadingMore(true);
    try {
      const next = await fetchMoreObservations({
        data: { id, offset: obs.length, limit: 50 },
      });
      setObs((current) => {
        const seen = new Set(current.map((item) => item.id));
        const appended = (next.observations ?? []).filter((item: any) => !seen.has(item.id));
        return [...current, ...appended];
      });
      setObsTotal(next.total ?? obsTotal);
    } catch (error: any) {
      toast.error(error?.message || t("objectDetail.loadMore"));
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteLayout>
    );
  if (!obj) {
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center">
          <h1 className="font-serif text-3xl">{t("objectDetail.notFound")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("objectDetail.notFoundBody")}</p>
          <Link
            to="/objects"
            className="mt-6 inline-block border border-foreground bg-foreground px-5 py-2.5 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
          >
            {t("common.backToObjects")}
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const topTags: { tag: string; count: number }[] = obj.top_tags ?? [];
  const archiveNo = objectArchiveCode(id);

  return (
    <SiteLayout>
      <section className="archive-desk border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:py-20">
          <PaperStack>
            <DossierPanel
              title={obj.name}
              eyebrow={objectType(obj.type)}
              stamp={archiveNo}
              meta={
                obj.description || t("objectDetail.reviewedCount", { count: obj.observation_count })
              }
              className="md:p-8"
            >
              <PaperRows
                rows={[
                  { label: t("common.object"), value: objectType(obj.type) },
                  {
                    label: t("objectDetail.reviewedCount", { count: obj.observation_count }),
                    value: archiveNo,
                    accent: true,
                  },
                ]}
              />

              <div className="mt-8">
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("objectDetail.aiSummary")}
                </div>
                <p className="mt-3 max-w-3xl text-base leading-relaxed">
                  {obj.ai_summary ?? t("objectDetail.noAISummary")}
                </p>
              </div>

              {topTags.length > 0 && (
                <div className="mt-8">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    {t("objectDetail.topTags")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topTags.map((t) => (
                      <span key={t.tag} className="paper-tag px-3 py-1 text-xs">
                        {tag(t.tag)} <span className="text-muted-foreground">· {t.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="paper-divider mt-8 flex flex-wrap items-center gap-3 pt-5">
                <Link
                  to="/submit/$objectId"
                  params={{ objectId: id }}
                  className="paper-action inline-block px-5 py-3 text-sm"
                >
                  {t("objectDetail.submit")}
                </Link>
                <FollowButton objectId={id} />
              </div>
            </DossierPanel>
          </PaperStack>

          <PaperStack>
            <DossierPanel
              tone="slip"
              eyebrow="Temperature Result"
              title={t("objectDetail.why")}
              stamp={obj.observation_count === 0 ? t("common.unmeasured") : "ARCHIVED"}
            >
              <TemperatureVerdict
                value={obj.observation_count === 0 ? null : obj.temperature}
                compact
              />
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {t("objectDetail.reviewedCount", { count: obj.observation_count })}
              </p>
              <button
                onClick={() => setShowExpl((v) => !v)}
                className="paper-action-secondary mt-4 w-full px-4 py-2 text-xs uppercase tracking-wider"
              >
                {showExpl ? t("objectDetail.collapse") : t("objectDetail.why")}
              </button>
            </DossierPanel>
          </PaperStack>
        </div>
      </section>

      {showExpl && (
        <section className="archive-desk border-b border-border py-12">
          <div className="container-prose space-y-8">
            <PaperSheet tone="dossier" className="p-5">
              <TemperatureBreakdown data={expl?.breakdown ?? null} />
            </PaperSheet>
            <PaperSheet tone="slip" className="p-5">
              <HeatSources heat={obj.heat_sources ?? []} cooling={obj.cooling_sources ?? []} />
            </PaperSheet>
            <PaperSheet tone="flat" className="p-5">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("objectDetail.timeline")}
              </h3>
              <div className="mt-4">
                <TemperatureTimeline objectId={id} limit={30} />
              </div>
            </PaperSheet>
          </div>
        </section>
      )}

      <section className="archive-desk py-16">
        <div className="container-prose">
          <PaperStack>
            <DossierPanel title={t("objectDetail.caseTimeline")} eyebrow="Case Timeline">
              <ObjectTimeline objectId={id} />
            </DossierPanel>
          </PaperStack>
        </div>
      </section>

      <section className="archive-desk border-t border-border py-16">
        <div className="container-prose">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">{t("objectDetail.allReviewed")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("objectDetail.showing", { shown: obs.length, total: obsTotal })}
              </p>
            </div>
            <Link
              to="/submit/$objectId"
              params={{ objectId: id }}
              className="paper-action-secondary px-3 py-1.5 text-xs uppercase tracking-wider"
            >
              {t("objectDetail.addObservation")}
            </Link>
          </div>
          {obs.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">{t("objectDetail.noReviewed")}</p>
          ) : (
            <div className="mt-8 grid gap-4">
              {obs.map((o) => (
                <PaperSheet key={o.id} tone="flat" className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <ArchiveStamp className="archive-stamp-soft">
                      {t("common.evidence")} {o.evidence_level}
                    </ArchiveStamp>
                    {(o.tags as string[])?.map((t) => (
                      <span key={t} className="text-accent">
                        #{tag(t)}
                      </span>
                    ))}
                    {o.scene && <span>· {o.scene}</span>}
                    <span className="ml-auto">{formatDateForLanguage(o.created_at, language)}</span>
                  </div>
                  {o.summary && (
                    <p className="mt-3 text-sm font-medium leading-relaxed">{o.summary}</p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {o.cleaned_content || o.content}
                  </p>
                  {o.reference_url && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <a
                        href={o.reference_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {t("objectDetail.sourceLink")}
                      </a>
                    </div>
                  )}
                </PaperSheet>
              ))}
            </div>
          )}
          {obs.length < obsTotal && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMoreObservations}
                disabled={loadingMore}
                className="paper-action-secondary px-5 py-2 text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {loadingMore ? t("common.loading") : t("objectDetail.loadMore")}
              </button>
            </div>
          )}
        </div>
      </section>

      <ObjectComments objectId={id} />
    </SiteLayout>
  );
}

function objectArchiveCode(id: string) {
  const suffix = id.replace(/-/g, "").slice(0, 4).toUpperCase() || "0000";
  return `FF-2026-${suffix}`;
}
