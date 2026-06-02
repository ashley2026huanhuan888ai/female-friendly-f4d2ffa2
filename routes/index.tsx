import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { FeedEventCard } from "@/components/FeedEventCard";
import { Thermometer } from "@/components/Thermometer";
import { BANDS, OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { getHomeSummary } from "@/lib/api/observation-center.functions";
import { useAuth } from "@/components/AuthProvider";
import { GuestPreviewList, GuestLoginPrompt, GUEST_NOTE } from "@/components/PreviewGate";

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
  const fetchSummary = useServerFn(getHomeSummary);
  const { ready, user } = useAuth();
  const isGuest = ready && !user;

  useEffect(() => {
    if (isGuest) return;
    fetchSummary().then(setSummary).catch(() => setSummary({
      today_events: [], today_events_count: 0, heating: [], cooling: [], latest_cases: [], latest_observations: [], newest_objects: [],
    }));
  }, [fetchSummary, isGuest]);

  if (isGuest) {
    return (
      <SiteLayout>
        <section className="border-b border-border">
          <div className="container-prose py-16 md:py-24">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Observatory · Est. 2026</div>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-balance md:text-6xl">
              持续观察<span className="text-accent">女性友好体验</span>的变化。
            </h1>
            <p className="mt-6 max-w-2xl text-sm text-muted-foreground">{GUEST_NOTE}</p>
            <div className="mt-6"><Link to="/login" className="inline-block border border-foreground bg-foreground px-5 py-2.5 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent">登录 / 注册</Link></div>
          </div>
        </section>
        <section className="py-12">
          <div className="container-prose">
            <h2 className="font-serif text-2xl">公开预览对象</h2>
            <div className="mt-6"><GuestPreviewList /></div>
            <div className="mt-8"><GuestLoginPrompt /></div>
          </div>
        </section>
      </SiteLayout>
    );
  }

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
              持续观察<span className="text-accent">女性友好体验</span>的变化。
            </h1>
            <p className="mt-8 max-w-2xl text-base text-muted-foreground">
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
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/objects" className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent">
                浏览测评对象
              </Link>
              <Link to="/feed" className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground">
                查看观察流
              </Link>
              <Link to="/request-object" className="border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground">
                增加新测评对象
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">观察</div>
            <div className="mt-4 font-serif text-4xl tabular-nums">
              {summary?.total_objects ?? "—"}
              <span className="ml-2 text-sm text-muted-foreground">个对象</span>
            </div>
            <div className="mt-6 space-y-3 text-xs">
              {(summary?.band_counts ?? []).map((b: any) => (
                <div key={b.band} className="flex items-center gap-3">
                  <span className="inline-block h-2.5 w-7 rounded-full" style={{ background: b.color }} />
                  <span className="font-mono tabular-nums text-muted-foreground">{b.range}</span>
                  <span>{b.label}</span>
                  <span className="ml-auto font-mono tabular-nums text-muted-foreground">{b.count}个对象</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 新加入测评对象 */}
      <section className="border-b border-border py-16">
        <div className="container-prose">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-3xl">新加入测评对象</h2>
            <Link to="/objects" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
              查看全部 →
            </Link>
          </div>
          {summary?.newest_objects?.length ? (
            <ul className="mt-8 grid gap-3 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-y-0">
              {summary.newest_objects.map((o: any) => (
                <li key={o.id} className="md:border-b md:border-border">
                  <Link to="/objects/$id" params={{ id: o.id }} className="flex items-center gap-3 py-3 hover:bg-card/60">
                    <Thermometer value={o.temperature} size="sm" showLabel={false} unmeasured={(o.observation_count ?? 0) === 0} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {OBJECT_TYPE_LABELS[o.type] ?? o.type}
                      </div>
                      <div className="truncate font-serif">{o.name}</div>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {o.observation_count ?? 0} 观察
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">暂无对象。</p>
          )}
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

      {/* 最新 AI 观察 */}
      <section className="border-b border-border py-16">
        <div className="container-prose">
          <h2 className="font-serif text-2xl">最新 AI 观察</h2>
          <p className="text-xs text-muted-foreground">AI 引擎对最新通过观察的结构化摘要。</p>
          {summary?.latest_observations?.length ? (
            <ul className="mt-6 grid gap-4 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-y-0">
              {summary.latest_observations.slice(0, 6).map((o: any) => (
                <li key={o.id} className="py-4 md:border-b md:border-border">
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
      </section>

      {/* 提交 / 申请 CTA */}
      <section className="border-b border-border bg-card/40 py-16">
        <div className="container-prose grid gap-6 md:grid-cols-2">
          <div className="border border-border bg-paper p-6">
            <h3 className="font-serif text-xl">提交一次观察</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              看到值得记录的现象？在对象页提交一条观察，AI 会清洗内容并参与温度计算。
            </p>
            <Link to="/objects" className="mt-4 inline-block border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent">
              选择对象 →
            </Link>
          </div>
          <div className="border border-border bg-paper p-6">
            <h3 className="font-serif text-xl">增加新测评对象</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              没找到你关心的品牌、影视或组织？提交申请，由管理员审核后纳入观察。
            </p>
            <Link to="/request-object" className="mt-4 inline-block border border-foreground/60 px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground">
              增加新测评对象 →
            </Link>
          </div>
        </div>
      </section>

      {/* 知识库（次要） */}
      <section className="py-12">
        <div className="container-prose">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">研究区 · Secondary</div>
          <h2 className="mt-2 font-serif text-xl text-muted-foreground">知识库与案例档案</h2>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
            知识库用于解释平台如何理解女性友好与性别偏见。新用户可以先从对象测评和观察提交开始。
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Link to="/knowledge" className="border border-border bg-card/60 p-4 text-sm hover:border-foreground/40">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">知识引擎</div>
              <div className="mt-1 font-serif">原则与方法论</div>
            </Link>
            <Link to="/archive" className="border border-border bg-card/60 p-4 text-sm hover:border-foreground/40">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">案例库</div>
              <div className="mt-1 font-serif">沉淀过的典型案例</div>
            </Link>
            <Link to="/topics" className="border border-border bg-card/60 p-4 text-sm hover:border-foreground/40">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">议题</div>
              <div className="mt-1 font-serif">热议中的女性体验话题</div>
            </Link>
          </div>
          {summary?.latest_cases?.length ? (
            <ul className="mt-6 divide-y divide-border border-t border-border text-sm">
              {summary.latest_cases.slice(0, 4).map((c: any) => (
                <li key={c.code} className="py-3">
                  <Link to="/archive/$caseCode" params={{ caseCode: c.code }} className="block text-muted-foreground hover:text-foreground">
                    <span className="font-mono text-[10px] uppercase tracking-wider">{c.code}</span>
                    <span className="ml-3 font-serif">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
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

