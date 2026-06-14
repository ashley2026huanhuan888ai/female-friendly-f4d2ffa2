import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { getObservationFeed } from "@/lib/api/observation-center.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "温度变化 · 女性友好体验测评" },
      { name: "description", content: "每一次温度变化的来源——升温、降温、新增案例。" },
    ],
  }),
  component: FeedPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-prose py-20">{error.message}</div>
    </SiteLayout>
  ),
});

type Kind = "all" | "heating" | "cooling";

function FeedPage() {
  const { t } = useI18n();
  usePageMeta("seo.feed.title", "seo.feed.description");
  const [kind, setKind] = useState<Kind>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchFeed = useServerFn(getObservationFeed);

  useEffect(() => {
    setLoading(true);
    fetchFeed({ data: { kind, limit: 60 } })
      .then((d) => setEvents(d as any[]))
      .finally(() => setLoading(false));
  }, [kind, fetchFeed]);

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Observation Feed
          </div>
          <h1 className="mt-4 font-serif text-4xl text-balance md:text-5xl">{t("feed.title")}</h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{t("feed.body")}</p>

          <div className="mt-8 inline-flex border border-border">
            {(["all", "heating", "cooling"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-4 py-2 text-xs uppercase tracking-wider ${
                  kind === k
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k === "all"
                  ? t("feed.all")
                  : k === "heating"
                    ? t("feed.heating")
                    : t("feed.cooling")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {loading ? (
            <p className="py-20 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : events.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">{t("feed.empty")}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {events.map((e) => (
                <FeedEventCard key={e.id} ev={e} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
