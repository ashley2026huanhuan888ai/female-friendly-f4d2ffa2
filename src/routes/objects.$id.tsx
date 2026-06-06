import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { ObjectTimeline } from "@/components/ObjectTimeline";
import { TemperatureBreakdown } from "@/components/TemperatureBreakdown";
import { HeatSources } from "@/components/HeatSources";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";
import { getTemperatureExplanation } from "@/lib/api/temperature.functions";
import { getPublicObjectDetail, getPublicObjectObservations } from "@/lib/api/platform.functions";
import { FollowButton } from "@/components/FollowButton";
import { OBJECT_TYPE_LABELS, bandOf } from "@/lib/temperature";

export const Route = createFileRoute("/objects/$id")({
  component: ObjectDetail,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-prose py-32 text-center">
        <h1 className="font-serif text-3xl">未找到该对象</h1>
        <Link to="/objects" className="mt-4 inline-block text-sm underline">
          返回全部对象
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-prose py-20">{error.message}</div>
    </SiteLayout>
  ),
});

function ObjectDetail() {
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
      toast.error(error?.message || "加载更多观察失败");
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">加载中…</div>
      </SiteLayout>
    );
  if (!obj) {
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center">
          <h1 className="font-serif text-3xl">未找到该对象</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            该对象可能尚未发布、已隐藏，或链接中的对象 ID 不正确。
          </p>
          <Link
            to="/objects"
            className="mt-6 inline-block border border-foreground bg-foreground px-5 py-2.5 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
          >
            返回全部对象
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const band = bandOf(obj.temperature);
  const topTags: { tag: string; count: number }[] = obj.top_tags ?? [];

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose grid gap-12 py-16 md:grid-cols-[1fr_auto] md:py-24">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {OBJECT_TYPE_LABELS[obj.type] ?? obj.type}
            </div>
            <h1 className="mt-4 font-serif text-5xl text-balance md:text-6xl">{obj.name}</h1>
            {obj.description && (
              <p className="mt-6 max-w-2xl text-base text-muted-foreground">{obj.description}</p>
            )}

            <div className="mt-10">
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                AI 总结
              </div>
              <p className="mt-3 max-w-2xl text-base leading-relaxed">
                {obj.ai_summary ?? "暂无足够观察生成总结。"}
              </p>
            </div>

            {topTags.length > 0 && (
              <div className="mt-10">
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  主要争议标签
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topTags.map((t) => (
                    <span key={t.tag} className="border border-border px-3 py-1 text-xs">
                      {t.tag} <span className="text-muted-foreground">· {t.count}</span>
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
                提交观察 →
              </Link>
              <FollowButton objectId={id} />
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end">
            <Thermometer
              value={obj.temperature}
              size="lg"
              unmeasured={obj.observation_count === 0}
            />
            <div className="mt-4 text-right text-xs text-muted-foreground">
              共 {obj.observation_count} 条已审核观察
            </div>
            <button
              onClick={() => setShowExpl((v) => !v)}
              className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {showExpl ? "收起" : "为什么是这个温度？"}
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
                温度变化时间线
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
          <h2 className="font-serif text-2xl">案例时间线</h2>
          <div className="mt-6">
            <ObjectTimeline objectId={id} />
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="container-prose">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">全部已审核观察</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                当前展示 {obs.length} / {obsTotal} 条已审核观察。
              </p>
            </div>
            <Link
              to="/submit/$objectId"
              params={{ objectId: id }}
              className="border border-foreground/60 px-3 py-1.5 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
            >
              添加观察
            </Link>
          </div>
          {obs.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">尚无已审核的观察记录。</p>
          ) : (
            <div className="mt-8 divide-y divide-border border-t border-border">
              {obs.map((o) => (
                <article key={o.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="border border-border px-1.5 py-0.5">
                      证据 {o.evidence_level}
                    </span>
                    {(o.tags as string[])?.map((t) => (
                      <span key={t} className="text-accent">
                        #{t}
                      </span>
                    ))}
                    {o.scene && <span>· {o.scene}</span>}
                    <span className="ml-auto">
                      {new Date(o.created_at).toLocaleDateString("zh-CN")}
                    </span>
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
                          来源链接
                        </a>
                      )}
                      {o.screenshot_url && (
                        <a
                          href={o.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:underline"
                        >
                          截图证据
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
                {loadingMore ? "加载中…" : "加载更多观察"}
              </button>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
