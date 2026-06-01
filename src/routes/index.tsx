import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { ObjectCard } from "@/components/ObjectCard";
import { Thermometer } from "@/components/Thermometer";
import { BANDS, OBJECT_TYPE_LABELS } from "@/lib/temperature";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "女性体验温度 · 观察 · 分析 · 不审判" },
      { name: "description", content: "收集对品牌、产品、影视、组织的女性体验观察，由 AI 结构化分析，以「温度」呈现性别议题密度。" },
      { property: "og:title", content: "女性体验温度" },
      { property: "og:description", content: "观察 · 分析 · 不审判。一个由用户观察驱动的女性体验温度观察平台。" },
    ],
  }),
  component: Index,
});

interface Obj {
  id: string; name: string; type: string; temperature: number; observation_count: number; ai_summary: string | null;
}

function Index() {
  const [hot, setHot] = useState<Obj[]>([]);
  const [recent, setRecent] = useState<Obj[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("objects").select("id,name,type,temperature,observation_count,ai_summary")
      .order("temperature", { ascending: false }).limit(6)
      .then(({ data }) => setHot(data ?? []));
    supabase.from("objects").select("id,name,type,temperature,observation_count,ai_summary")
      .order("updated_at", { ascending: false }).limit(6)
      .then(({ data }) => setRecent(data ?? []));
  }, []);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="container-prose grid gap-10 py-20 md:grid-cols-[1.5fr_1fr] md:py-32">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Observatory · Est. 2026
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-balance md:text-7xl">
              一个测量
              <br />
              <span className="text-accent">女性体验温度</span>
              <br />
              的观察平台。
            </h1>
            <p className="mt-8 max-w-xl text-base text-muted-foreground">
              用户提交观察，AI 进行结构化分析，最终以温度形式呈现性别偏见、女性物化、性别规训等议题的集中度。
              本平台<strong className="text-foreground">不进行法律意义上的事实认定，不进行道德审判</strong>。
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/objects?q=${encodeURIComponent(q)}`;
              }}
              className="mt-10 flex max-w-lg border border-foreground"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索品牌、影视、组织、事件…"
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-foreground px-5 py-3 text-sm text-background hover:bg-accent">
                查询
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Link to="/objects" className="underline-offset-4 hover:underline">浏览全部对象</Link>
              <span>·</span>
              <Link to="/request-object" className="underline-offset-4 hover:underline">我希望评估某个对象</Link>
            </div>
          </div>

          {/* 温度区间图例 */}
          <div className="border border-border bg-card p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">温度区间</div>
            <div className="mt-5 space-y-3">
              {BANDS.map((b) => (
                <div key={b.band} className="flex items-center gap-3 text-sm">
                  <span
                    className="inline-block h-3 w-8 rounded-full"
                    style={{ background: b.color }}
                  />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {b.range[0]}–{b.range[1]}°
                  </span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              温度由 AI 综合证据强度、标签多样性与议题集中度生成。
              <strong className="text-foreground">评论数量不直接影响温度。</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 温度排行榜 */}
      <section className="border-b border-border py-20">
        <div className="container-prose">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-3xl">高温观察榜</h2>
            <Link to="/objects" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
              全部对象 →
            </Link>
          </div>
          {hot.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {hot.map((o) => <ObjectCard key={o.id} {...o} />)}
            </div>
          )}
        </div>
      </section>

      {/* 最新更新 */}
      <section className="py-20">
        <div className="container-prose">
          <h2 className="font-serif text-3xl">最新更新</h2>
          {recent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {recent.map((o) => <ObjectCard key={o.id} {...o} />)}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 border border-dashed border-border p-12 text-center">
      <Thermometer value={24} size="md" />
      <p className="mt-6 text-sm text-muted-foreground">
        尚无对象。管理员可在后台创建评估对象，或用户可提交「我希望评估 XXX」申请。
      </p>
      <div className="mt-4 flex justify-center gap-3 text-xs">
        <Link to="/request-object" className="underline">提交申请</Link>
        <Link to="/admin" className="underline">管理后台</Link>
      </div>
    </div>
  );
}
