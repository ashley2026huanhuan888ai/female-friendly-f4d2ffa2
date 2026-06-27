import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { ObjectCard } from "@/components/ObjectCard";
import { getTopicDetail } from "@/lib/api/observation-center.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/topics/$tag")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/objects",
      search: { tag: params.tag },
      replace: true,
    });
  },
  component: TopicDetail,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-prose py-20">{error.message}</div>
    </SiteLayout>
  ),
});

function TopicDetail() {
  const { language, t, tag: tagLabel, polarity } = useI18n();
  const { tag } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchTopic = useServerFn(getTopicDetail);

  useEffect(() => {
    setLoading(true);
    fetchTopic({ data: { tag } })
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [tag, fetchTopic]);

  if (loading)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteLayout>
    );
  if (!data) return null;

  const maxMonth = Math.max(1, ...data.trend.map((t: any) => t.count));

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Topic</div>
          <h1 className="mt-4 font-serif text-5xl text-balance">
            <Link
              to="/objects"
              search={{ tag: data.tag }}
              className="underline-offset-8 hover:text-accent hover:underline"
            >
              #{tagLabel(data.tag)}
            </Link>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("topics.summary", {
              total: data.total,
              objects: data.related_objects.length,
              cases: data.cases.length,
            })}
          </p>
        </div>
      </section>

      {data.trend.length > 0 && (
        <section className="border-b border-border py-10">
          <div className="container-prose">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("topics.monthlyTrend")}
            </h2>
            <div className="mt-6 flex items-end gap-1">
              {data.trend.map((point: any) => (
                <div key={point.month} className="flex-1 text-center">
                  <div
                    className="mx-auto w-full bg-accent/70"
                    style={{ height: `${(point.count / maxMonth) * 80}px`, minHeight: 2 }}
                    title={`${point.month}: ${point.count}`}
                  />
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {point.month.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.related_objects.length > 0 && (
        <section className="border-b border-border py-12">
          <div className="container-prose">
            <h2 className="font-serif text-2xl">{t("topics.relatedObjects")}</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {data.related_objects.map((o: any) => (
                <ObjectCard key={o.id} {...o} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data.cases.length > 0 && (
        <section className="border-b border-border py-12">
          <div className="container-prose">
            <h2 className="font-serif text-2xl">{t("topics.citedCases")}</h2>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {data.cases.map((c: any) => (
                <li key={c.code} className="py-4">
                  <Link
                    to="/archive/$caseCode"
                    params={{ caseCode: c.code }}
                    className="block hover:bg-card/60"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.code} · {polarity(c.polarity)}
                    </div>
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
          <h2 className="font-serif text-2xl">{t("topics.recentObservations")}</h2>
          {data.observations.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">{t("common.noObservations")}</p>
          ) : (
            <ul className="mt-6 divide-y divide-border border-t border-border">
              {data.observations.slice(0, 30).map((o: any) => (
                <li key={o.id} className="py-4">
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
                    · {t("common.evidence")} {o.evidence_level ?? "—"} ·{" "}
                    {formatDateForLanguage(o.created_at, language)}
                  </div>
                  <p className="mt-1 text-sm">{o.summary ?? t("common.noSummary")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
