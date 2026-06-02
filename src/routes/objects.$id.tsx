import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { ObjectTimeline } from "@/components/ObjectTimeline";
import { TemperatureBreakdown } from "@/components/TemperatureBreakdown";
import { HeatSources } from "@/components/HeatSources";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";
import { getTemperatureExplanation } from "@/lib/api/temperature.functions";
import { FollowButton } from "@/components/FollowButton";
import { OBJECT_TYPE_LABELS, bandOf } from "@/lib/temperature";


export const Route = createFileRoute("/objects/$id")({
  component: ObjectDetail,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-prose py-32 text-center">
        <h1 className="font-serif text-3xl">未找到该对象</h1>
        <Link to="/objects" className="mt-4 inline-block text-sm underline">返回全部对象</Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container-prose py-20">{error.message}</div></SiteLayout>
  ),
});

function ObjectDetail() {
  const { id } = Route.useParams();
  const [obj, setObj] = useState<any>(null);
  const [obs, setObs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expl, setExpl] = useState<{ breakdown: any; object: any } | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const fetchExpl = useServerFn(getTemperatureExplanation);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("objects").select("*").eq("id", id).maybeSingle();
      setObj(data);
      const { data: o } = await supabase.from("observations")
        .select("id, cleaned_content, content, scene, tags, evidence_level, created_at")
        .eq("object_id", id).eq("status", "approved")
        .order("created_at", { ascending: false }).limit(50);
      setObs(o ?? []);
      setLoading(false);
      fetchExpl({ data: { object_id: id } }).then((d) => setExpl(d as never)).catch(() => {});
    })();
  }, [id, fetchExpl]);

  if (loading) return <SiteLayout><div className="container-prose py-32 text-center text-muted-foreground">加载中…</div></SiteLayout>;
  if (!obj) return <SiteLayout><div className="container-prose py-32 text-center">对象不存在</div></SiteLayout>;

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
            {obj.description && <p className="mt-6 max-w-2xl text-base text-muted-foreground">{obj.description}</p>}

            <div className="mt-10">
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">AI 总结</div>
              <p className="mt-3 max-w-2xl text-base leading-relaxed">
                {obj.ai_summary ?? "暂无足够观察生成总结。"}
              </p>
            </div>

            {topTags.length > 0 && (
              <div className="mt-10">
                <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">主要争议标签</div>
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
            <Thermometer value={obj.temperature} size="lg" unmeasured={obj.observation_count === 0} />
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
            <HeatSources
              heat={obj.heat_sources ?? []}
              cooling={obj.cooling_sources ?? []}
            />
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">温度变化时间线</h3>
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
          <h2 className="font-serif text-2xl">最近观察</h2>
          {obs.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">尚无已审核的观察记录。</p>
          ) : (
            <div className="mt-8 divide-y divide-border border-t border-border">
              {obs.map((o) => (
                <article key={o.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="border border-border px-1.5 py-0.5">证据 {o.evidence_level}</span>
                    {(o.tags as string[])?.map((t) => (
                      <span key={t} className="text-accent">#{t}</span>
                    ))}
                    {o.scene && <span>· {o.scene}</span>}
                    <span className="ml-auto">{new Date(o.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{o.cleaned_content || o.content}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
