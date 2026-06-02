import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { ObjectCard } from "@/components/ObjectCard";
import { getTopicDetail } from "@/lib/api/observation-center.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

export const Route = createFileRoute("/topics/$tag")({
  component: TopicDetail,
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container-prose py-20">{error.message}</div></SiteLayout>
  ),
});

function TopicDetail() {
  const { tag } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchTopic = useServerFn(getTopicDetail);

  useEffect(() => {
    setLoading(true);
    fetchTopic({ data: { tag } }).then((d) => setData(d)).finally(() => setLoading(false));
  }, [tag, fetchTopic]);

  if (loading) return <SiteLayout><div className="container-prose py-32 text-center text-muted-foreground">加载中…</div></SiteLayout>;
  if (!data) return null;

  const maxMonth = Math.max(1, ...data.trend.map((t: any) => t.count));

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Topic</div>
          <h1 className="mt-4 font-serif text-5xl text-balance">#{data.tag}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            共 <strong className="text-foreground">{data.total}</strong> 条已审核观察 ·
            涉及 <strong className="text-foreground">{data.related_objects.length}</strong> 个对象 ·
            <strong className="text-foreground"> {data.cases.length}</strong> 个知识案例。
          </p>
        </div>
      </section>

      {data.trend.length > 0 && (
        <section className="border-b border-border py-10">
          <div className="container-prose">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">观察月度趋势</h2>
            <div className="mt-6 flex items-end gap-1">
              {data.trend.map((t: any) => (
                <div key={t.month} className="flex-1 text-center">
                  <div
                    className="mx-auto w-full bg-accent/70"
                    style={{ height: `${(t.count / maxMonth) * 80}px`, minHeight: 2 }}
                    title={`${t.month}：${t.count} 条`}
                  />
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">{t.month.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.related_objects.length > 0 && (
        <section className="border-b border-border py-12">
          <div className="container-prose">
            <h2 className="font-serif text-2xl">相关对象</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {data.related_objects.map((o: any) => (
                <Link
                  key={o.id}
                  to="/objects/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between border border-border bg-card p-4 hover:border-foreground/40"
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {OBJECT_TYPE_LABELS[o.type] ?? o.type}
                    </div>
                    <div className="mt-1 font-serif text-lg">{o.name}</div>
                  </div>
                  <Thermometer value={o.temperature} size="sm" showLabel={false} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.cases.length > 0 && (
        <section className="border-b border-border py-12">
          <div className="container-prose">
            <h2 className="font-serif text-2xl">引用案例</h2>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {data.cases.map((c: any) => (
                <li key={c.code} className="py-4">
                  <Link to="/archive/$caseCode" params={{ caseCode: c.code }} className="block hover:bg-card/60">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.code} · {c.polarity}</div>
                    <div className="mt-1 font-serif text-lg">{c.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="container-prose">
          <h2 className="font-serif text-2xl">最近观察</h2>
          {data.observations.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">暂无观察。</p>
          ) : (
            <ul className="mt-6 divide-y divide-border border-t border-border">
              {data.observations.slice(0, 30).map((o: any) => (
                <li key={o.id} className="py-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {o.object?.name ?? "—"} · 证据 {o.evidence_level ?? "—"} · {new Date(o.created_at).toLocaleDateString("zh-CN")}
                  </div>
                  <p className="mt-1 text-sm">{o.summary ?? "（无摘要）"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
