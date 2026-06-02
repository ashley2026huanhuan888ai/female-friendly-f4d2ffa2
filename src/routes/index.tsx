import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { Thermometer } from "@/components/Thermometer";
import { BANDS, OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { getHomeSummary } from "@/lib/api/observation-center.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "女性友好体验测评 · 观察平台" },
      { name: "description", content: "持续观察品牌、产品、影视、组织的女性体验。AI 引擎、可追溯温度、可解释变化。" },
      { property: "og:title", content: "女性友好体验测评" },
      { property: "og:description", content: "观察 · 分析 · 不审判。" },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const fetchSummary = useServerFn(getHomeSummary);

  useEffect(() => {
    fetchSummary().then(setSummary).catch(() => setSummary({
      today_events: [], today_events_count: 0, heating: [], cooling: [], latest_cases: [], latest_observations: [],
    }));
  }, [fetchSummary]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
      } else {
        setIsAdmin(false);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="container-prose grid gap-10 py-16 md:grid-cols-[1.5fr_1fr] md:py-24">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Observatory · Est. 2026
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-balance md:text-7xl">
              持续观察<br />
              <span className="text-accent">女性友好体验</span>的<br />变化。
            </h1>
            <p className="mt-8 max-w-xl text-base text-muted-foreground">
              这里不是评分网站，是观察平台。我们记录每一次女性友好温度变化的来源——案例、证据、议题。
              <strong className="text-foreground">不做事实认定，不做道德审判。</strong>
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
              <button className="bg-foreground px-5 py-3 text-sm text-background hover:bg-accent">查询</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <Link to="/feed" className="underline-offset-4 hover:underline">查看观察流 →</Link>
              <span>·</span>
              <Link to="/topics" className="underline-offset-4 hover:underline">热议议题</Link>
              <span>·</span>
              <Link to="/request-object" className="underline-offset-4 hover:underline">我希望评估某个对象</Link>
            </div>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">今日观察</div>
            <div className="mt-4 font-serif text-4xl tabular-nums">
              {summary?.today_events_count ?? "—"}
              <span className="ml-2 text-sm text-muted-foreground">次温度变化</span>
            </div>
            <div className="mt-6 space-y-3 text-xs">
              {BANDS.map((b) => (
                <div key={b.band} className="flex items-center gap-3">
                  <span className="inline-block h-2.5 w-7 rounded-full" style={{ background: b.color }} />
                  <span className="font-mono tabular-nums text-muted-foreground">{b.range[0]}–{b.range[1]}°</span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 近期升温 / 降温 */}
      <section className="border-b border-border py-16">
        <div className="container-prose grid gap-10 md:grid-cols-2">
          <ColumnList title="近期升温对象" hint="过去 7 天累计升温最多" items={summary?.heating ?? []} positive />
          <ColumnList title="近期降温对象" hint="过去 7 天累计降温最多" items={summary?.cooling ?? []} />
        </div>
      </section>

      {/* 最近温度事件 */}
      <section className="border-b border-border py-16">
        <div className="container-prose">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-3xl">最新观察事件</h2>
            <Link to="/feed" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
              查看全部 →
            </Link>
          </div>
          {!summary?.today_events?.length ? (
            <p className="mt-10 border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              过去 24 小时暂无温度变化。
            </p>
          ) : (
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {summary.today_events.map((e: any, i: number) => (
                <FeedEventCard key={i} ev={{ ...e, id: String(i) }} />
              ))}
            </div>

          )}
        </div>
      </section>

      {/* 新增案例 + 最新AI观察 */}
      <section className="py-16">
        <div className="container-prose grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl">新增案例</h2>
            <p className="text-xs text-muted-foreground">最近沉淀进知识库的案例。</p>
            {summary?.latest_cases?.length ? (
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {summary.latest_cases.map((c: any) => (
                  <li key={c.code} className="py-4">
                    <Link to="/archive/$caseCode" params={{ caseCode: c.code }} className="block hover:bg-card/60">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.code} · {c.polarity}
                      </div>
                      <div className="mt-1 font-serif">{c.title}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">暂无新案例。</p>
            )}
          </div>

          <div>
            <h2 className="font-serif text-2xl">最新 AI 观察</h2>
            <p className="text-xs text-muted-foreground">AI 引擎对最新通过观察的结构化摘要。</p>
            {summary?.latest_observations?.length ? (
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {summary.latest_observations.slice(0, 6).map((o: any) => (
                  <li key={o.id} className="py-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {o.object?.name ?? "—"} · 证据 {o.evidence_level ?? "—"}
                    </div>
                    <p className="mt-1 text-sm">{o.summary ?? "（无摘要）"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">暂无观察。</p>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ColumnList({ title, hint, items, positive }: { title: string; hint: string; items: any[]; positive?: boolean }) {
  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">本周无变化。</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {items.map((o) => (
            <li key={o.id}>
              <Link
                to="/objects/$id" params={{ id: o.id }}
                className="flex items-center gap-3 py-3 hover:bg-card/60"
              >
                <Thermometer value={o.temperature} size="sm" showLabel={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {OBJECT_TYPE_LABELS[o.type] ?? o.type}
                  </div>
                  <div className="truncate font-serif">{o.name}</div>
                </div>
                <span className={`font-mono text-sm tabular-nums ${positive ? "text-foreground" : "text-muted-foreground"}`}>
                  {o.delta_7d > 0 ? "+" : ""}{o.delta_7d}°C
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

