import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { getTrendingTopics } from "@/lib/api/observation-center.functions";

export const Route = createFileRoute("/topics")({
  head: () => ({
    meta: [
      { title: "热议议题 · 女性体验温度" },
      { name: "description", content: "近期被持续观察的标签与议题。" },
    ],
  }),
  component: TopicsPage,
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container-prose py-20">{error.message}</div></SiteLayout>
  ),
});

function TopicsPage() {
  const [items, setItems] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchTopics = useServerFn(getTrendingTopics);

  useEffect(() => {
    fetchTopics({ data: { days: 30 } })
      .then((d) => setItems(d as any))
      .finally(() => setLoading(false));
  }, [fetchTopics]);

  const max = items[0]?.count ?? 1;

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Trending Topics</div>
          <h1 className="mt-4 font-serif text-4xl">热议议题</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            过去 30 天内，被持续观察的女性议题标签。点击任一标签查看案例、相关对象与趋势。
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {loading ? (
            <p className="py-20 text-center text-sm text-muted-foreground">加载中…</p>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">近 30 天暂无足够观察形成趋势。</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {items.map((t) => (
                <li key={t.tag}>
                  <Link
                    to="/topics/$tag"
                    params={{ tag: t.tag }}
                    className="flex items-center gap-6 py-4 transition-colors hover:bg-card/60"
                  >
                    <span className="font-serif text-xl text-balance">{t.tag}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                      {t.count} 次观察
                    </span>
                    <span className="hidden h-1.5 w-40 bg-subtle md:block">
                      <span
                        className="block h-full bg-accent"
                        style={{ width: `${(t.count / max) * 100}%` }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
