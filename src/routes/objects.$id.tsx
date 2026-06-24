import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { TempText } from "@/components/TempText";
import { ObjectTimeline } from "@/components/ObjectTimeline";
import { TemperatureBreakdown } from "@/components/TemperatureBreakdown";
import { HeatSources } from "@/components/HeatSources";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";
import { getTemperatureExplanation } from "@/lib/api/temperature.functions";
import { getPublicObjectDetail, getPublicObjectObservations, deleteObservation } from "@/lib/api/platform.functions";
import { useAuth } from "@/components/auth-context";

import { FollowButton } from "@/components/FollowButton";
import { ObjectComments } from "@/components/ObjectComments";
import { ExportCardDialog } from "@/components/ExportCardDialog";
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
  const [showExport, setShowExport] = useState(false);
  const fetchExpl = useServerFn(getTemperatureExplanation);

  const fetchDetail = useServerFn(getPublicObjectDetail);
  const fetchMoreObservations = useServerFn(getPublicObjectObservations);
  const removeObservation = useServerFn(deleteObservation);
  const { isAdmin } = useAuth();

  async function handleDeleteObservation(obsId: string) {
    if (!confirm(t("objectDetail.deleteConfirm"))) return;
    try {
      await removeObservation({ data: { id: obsId } });
      setObs((prev) => prev.filter((o) => o.id !== obsId));
      setObsTotal((n) => Math.max(0, n - 1));
      toast.success(t("objectDetail.deleteSuccess"));
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  }


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

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose grid grid-cols-1 items-start gap-4 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 md:py-24">
          <div className="min-w-0 order-2 md:order-1">
            <div className="hidden md:flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">
                {t("objectDetail.reviewedCount", { count: obj.observation_count })}
              </span>
              <span aria-hidden>·</span>
              <span>{objectType(obj.type)}</span>
            </div>

            {/* Mobile: title + temperature number on one row */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 md:hidden">
              <h1 className="font-serif text-3xl text-balance">{obj.name}</h1>
              {obj.observation_count > 0 && (
                <TempText value={obj.temperature} size="md" />
              )}
            </div>

            {/* Mobile: hint + export button on second row */}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:hidden">
              <p className="text-xs leading-relaxed text-muted-foreground">{t("objectDetail.why")}</p>
              <button
                onClick={() => setShowExport(true)}
                className="shrink-0 border border-foreground/60 px-3 py-1.5 text-[11px] uppercase tracking-wider hover:border-foreground"
              >
                {t("export.button")}
              </button>
            </div>

            {/* Desktop: title + export button */}
            <div className="mt-3 hidden md:flex flex-wrap items-start gap-3 md:mt-4">
              <h1 className="font-serif text-balance sm:text-5xl md:text-6xl">{obj.name}</h1>
              <button
                onClick={() => setShowExport(true)}
                className="mt-2 shrink-0 border border-foreground/60 px-3 py-1.5 text-[11px] uppercase tracking-wider hover:border-foreground"
              >
                {t("export.button")}
              </button>
            </div>

            {obj.description && (
              <p className="mt-6 max-w-2xl text-base text-muted-foreground">{obj.description}</p>
            )}


            {/* Mobile: tag cloud sized by mention count */}
            {topTags.length > 0 ? (
              <div className="mt-4 rounded-sm bg-card/40 px-4 py-5 md:hidden">
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("objectDetail.topTags")}
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  {(() => {
                    const max = topTags[0]?.count ?? 1;
                    const min = topTags[topTags.length - 1]?.count ?? 1;
                    const range = Math.max(max - min, 1);
                    return topTags.map((tt) => {
                      const ratio = (tt.count - min) / range; // 0..1
                      const tier = ratio > 0.75 ? 0 : ratio > 0.5 ? 1 : ratio > 0.25 ? 2 : 3;
                      const cls = [
                        "text-2xl font-semibold text-foreground",
                        "text-xl font-semibold text-foreground/90",
                        "text-base font-medium text-foreground/75",
                        "text-sm text-muted-foreground",
                      ][tier];
                      return (
                        <span key={tt.tag} className={`leading-tight ${cls}`}>
                          {tag(tt.tag)}
                          <span className="ml-1 text-[10px] text-muted-foreground align-baseline">
                            ·{tt.count}
                          </span>
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-sm bg-card/40 px-4 py-5 md:hidden">
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("objectDetail.latestObservation")}
                </div>
                <p className="mt-2 text-[15px] leading-7 whitespace-pre-wrap">
                  {obs[0]?.content ?? t("objectDetail.noObservation")}
                </p>
              </div>
            )}

            {/* Desktop: latest observation */}
            <div className="mt-10 hidden md:block">
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {t("objectDetail.latestObservation")}
              </div>
              <p className="mt-3 max-w-2xl text-base leading-relaxed whitespace-pre-wrap">
                {obs[0]?.content ?? t("objectDetail.noObservation")}
              </p>
            </div>

            {topTags.length > 0 && (
              <div className="mt-10 hidden md:block">
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("objectDetail.topTags")}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topTags.map((tt) => (
                    <span key={tt.tag} className="border border-border px-3 py-1 text-xs">
                      {tag(tt.tag)} <span className="text-muted-foreground">· {tt.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}


            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/submit/$objectId"
                params={{ objectId: id }}
                className="inline-block border border-foreground bg-foreground px-5 py-3 text-sm text-background hover:bg-accent hover:border-accent"
              >
                {t("objectDetail.submit")}
              </Link>
              <FollowButton objectId={id} />
            </div>
          </div>

          <div className="order-1 hidden shrink-0 flex-row items-center gap-3 md:order-2 md:flex md:flex-col md:items-end">
            <Thermometer
              value={obj.temperature}
              size="lg"
              unmeasured={obj.observation_count === 0}
            />
            <button
              onClick={() => setShowExpl((v) => !v)}
              className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:mt-3"
            >
              {showExpl ? t("objectDetail.collapse") : t("objectDetail.why")}
            </button>
          </div>

        </div>
      </section>

      {showExpl && (
        <section className="border-b border-border bg-card/40 py-12">
          <div className="container-prose space-y-8">
            <TemperatureBreakdown data={expl?.breakdown ?? null} />
            <HeatSources heat={obj.heat_sources ?? []} cooling={obj.cooling_sources ?? []} />
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("objectDetail.timeline")}
              </h3>
              <div className="mt-4">
                <TemperatureTimeline objectId={id} limit={30} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="container-prose">
          <h2 className="font-serif text-2xl">{t("objectDetail.caseTimeline")}</h2>
          <div className="mt-6">
            <ObjectTimeline objectId={id} />
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16">
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
              className="border border-foreground/60 px-3 py-1.5 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              {t("objectDetail.addObservation")}
            </Link>
          </div>
          {obs.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">{t("objectDetail.noReviewed")}</p>
          ) : (
            <div className="mt-8 divide-y divide-border border-t border-border">
              {obs.map((o) => (
                <article key={o.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="border border-border px-1.5 py-0.5">
                      {t("common.evidence")} {o.evidence_level}
                    </span>
                    {(o.tags as string[])?.map((t) => (
                      <span key={t} className="text-accent">
                        #{tag(t)}
                      </span>
                    ))}
                    {o.scene && <span>· {o.scene}</span>}
                    <span className="ml-auto">{formatDateForLanguage(o.created_at, language)}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteObservation(o.id)}
                        className="border border-destructive/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        {t("objectDetail.deleteObservation")}
                      </button>
                    )}

                  </div>
                  {o.summary && (
                    <p className="mt-3 text-sm font-medium leading-relaxed">{o.summary}</p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {o.cleaned_content || o.content}
                  </p>
                  {(o.reference_url || o.screenshot_url) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      {o.reference_url && (
                        <a
                          href={o.reference_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:underline"
                        >
                          {t("objectDetail.sourceLink")}
                        </a>
                      )}
                      {o.screenshot_url && (
                        <a
                          href={o.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:underline"
                        >
                          {t("objectDetail.screenshotEvidence")}
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          {obs.length < obsTotal && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMoreObservations}
                disabled={loadingMore}
                className="border border-foreground/60 px-5 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground disabled:opacity-50"
              >
                {loadingMore ? t("common.loading") : t("objectDetail.loadMore")}
              </button>
            </div>
          )}
        </div>
      </section>

      <ObjectComments objectId={id} />

      <ExportCardDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        object={{ id, name: obj.name, type: obj.type, temperature: obj.temperature }}
        observations={obs}
      />
    </SiteLayout>

  );
}
