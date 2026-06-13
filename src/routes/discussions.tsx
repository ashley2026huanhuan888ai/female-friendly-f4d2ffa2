import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { listRecentObjectComments } from "@/lib/api/comment.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

export const Route = createFileRoute("/discussions")({
  head: () => ({ meta: [{ title: "热门讨论 · 女性友好体验测评" }] }),
  component: Discussions,
});

function Discussions() {
  const [items, setItems] = useState<any[]>([]);
  const fetchComments = useServerFn(listRecentObjectComments);

  useEffect(() => {
    fetchComments({ data: { limit: 30 } })
      .then((data) => setItems((data as any[] | null) ?? []))
      .catch(() => setItems([]));
  }, [fetchComments]);

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <h1 className="font-serif text-4xl">热门讨论</h1>
          <p className="mt-3 text-sm text-muted-foreground">最近公开的对象留言。</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">暂无讨论</p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {items.map((o) => (
                <article key={o.id} className="py-6">
                  <Link
                    to="/objects/$id"
                    params={{ id: o.objects.id }}
                    className="flex items-start justify-between gap-6 group"
                  >
                    <div className="flex-1">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {OBJECT_TYPE_LABELS[o.objects.type]} ·{" "}
                        {new Date(o.created_at).toLocaleDateString("zh-CN")}
                      </div>
                      <h3 className="mt-2 font-serif text-2xl group-hover:text-accent">
                        {o.objects.name}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{o.body}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span>{o.author_label}</span>
                        {o.helpful_count > 0 && <span>有帮助 {o.helpful_count}</span>}
                      </div>
                    </div>
                    <Thermometer value={o.objects.temperature} size="sm" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
