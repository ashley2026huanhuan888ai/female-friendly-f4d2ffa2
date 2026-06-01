import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { ObjectCard } from "@/components/ObjectCard";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

export const Route = createFileRoute("/objects")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) ?? "" }),
  head: () => ({
    meta: [
      { title: "全部对象 · 女性体验温度" },
      { name: "description", content: "浏览所有评估对象，按温度排序，按类型筛选。" },
    ],
  }),
  component: AllObjects,
});

function AllObjects() {
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState<string>("");
  const [sort, setSort] = useState<"temp" | "recent">("temp");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let query = supabase.from("objects").select("id,name,type,temperature,observation_count,ai_summary");
    if (type) query = query.eq("type", type as any);
    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    query = sort === "temp"
      ? query.order("temperature", { ascending: false })
      : query.order("updated_at", { ascending: false });
    query.limit(60).then(({ data }) => setItems(data ?? []));
  }, [q, type, sort]);

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <h1 className="font-serif text-4xl">全部对象</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            找不到？<Link to="/request-object" className="underline">提交评估申请</Link>
          </p>

          <div className="mt-10 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="按名称搜索"
              className="border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="">全部类型</option>
              {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="temp">温度从高到低</option>
              <option value="recent">最近更新</option>
            </select>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">暂无对象</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((o) => <ObjectCard key={o.id} {...o} />)}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
