import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminAnalytics } from "@/lib/api/platform.functions";

export const Route = createFileRoute("/admin/analytics")({ component: Analytics });

type Stats = Awaited<ReturnType<typeof getAdminAnalytics>>;

function Analytics() {
  const fetchStats = useServerFn(getAdminAnalytics);
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { fetchStats({}).then(setS).catch(() => setS(null)); }, []);

  if (!s) return <div className="container-prose py-12 text-sm text-muted-foreground">加载中…</div>;

  const cards = [
    { label: "近 30 天新增观察", value: s.observations_30d },
    { label: "审核通过率", value: `${s.approve_rate}%` },
    { label: "高风险内容（30d）", value: s.high_risk_30d },
    { label: "对象总数", value: s.objects_total },
  ];

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">数据概览</h1>
      <p className="mt-2 text-sm text-muted-foreground">近 30 天平台关键指标。</p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="mt-3 font-serif text-4xl tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-medium">最活跃对象</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {s.top_objects.map((o) => (
              <li key={o.id} className="flex items-center justify-between border-b border-border/60 py-1.5">
                <span>{o.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {o.observation_count} 条 · {Number(o.temperature).toFixed(0)}°
                </span>
              </li>
            ))}
            {s.top_objects.length === 0 && <li className="text-muted-foreground">暂无</li>}
          </ul>
        </div>
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-medium">高信誉用户</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {s.top_users.map((u) => (
              <li key={u.id} className="flex items-center justify-between border-b border-border/60 py-1.5">
                <span>{u.display_name || u.email || u.id.slice(0, 8)}</span>
                <span className="text-xs tabular-nums text-accent">{u.reputation}</span>
              </li>
            ))}
            {s.top_users.length === 0 && <li className="text-muted-foreground">暂无</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
