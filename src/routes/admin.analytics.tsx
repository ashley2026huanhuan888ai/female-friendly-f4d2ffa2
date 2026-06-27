import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminAnalytics, listAllUsers } from "@/lib/api/platform.functions";
import { reputationLevel } from "@/lib/reputation";

export const Route = createFileRoute("/admin/analytics")({ component: Analytics });

type Stats = Awaited<ReturnType<typeof getAdminAnalytics>>;
type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  reputation: number;
  auto_approve: boolean;
  created_at: string;
};

function Analytics() {
  const fetchStats = useServerFn(getAdminAnalytics);
  const fetchUsers = useServerFn(listAllUsers);
  const [s, setS] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchStats({})
      .then(setS)
      .catch(() => setS(null));
  }, [fetchStats]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchUsers({ data: { q, limit: 200 } })
        .then((r) => {
          setUsers(r.items as UserRow[]);
          setUserTotal(r.total);
        })
        .catch(() => {
          setUsers([]);
          setUserTotal(0);
        });
    }, 200);
    return () => clearTimeout(t);
  }, [fetchUsers, q]);

  const cards = useMemo(
    () =>
      s
        ? [
            { label: "近 30 天新增观察", value: s.observations_30d },
            { label: "审核通过率", value: `${s.approve_rate}%` },
            { label: "高风险内容（30d）", value: s.high_risk_30d },
            { label: "对象总数", value: s.objects_total },
            { label: "注册用户总数", value: s.users_total },
          ]
        : [],
    [s],
  );

  if (!s) return <div className="container-prose py-12 text-sm text-muted-foreground">加载中…</div>;

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">数据概览</h1>
      <p className="mt-2 text-sm text-muted-foreground">近 30 天平台关键指标。</p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
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
              <li
                key={o.id}
                className="flex items-center justify-between border-b border-border/60 py-1.5"
              >
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
              <li
                key={u.id}
                className="flex items-center justify-between border-b border-border/60 py-1.5"
              >
                <span>{u.display_name || u.email || u.id.slice(0, 8)}</span>
                <span className="text-xs tabular-nums text-accent">{u.reputation}</span>
              </li>
            ))}
            {s.top_users.length === 0 && <li className="text-muted-foreground">暂无</li>}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">全部注册用户</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              共 {userTotal} 位用户{userTotal > users.length ? `，仅显示最近 ${users.length} 位` : ""}
              {userTotal > users.length && (
                <>
                  ，前往{" "}
                  <Link to="/admin/users" className="underline hover:text-foreground">
                    用户信誉
                  </Link>{" "}
                  调整。
                </>
              )}
            </p>
          </div>
          <input
            placeholder="按邮箱 / 昵称搜索…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-xs border border-border bg-card px-3 py-2 text-sm"
          />
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3">用户</th>
              <th>邮箱</th>
              <th>信誉</th>
              <th>等级</th>
              <th>自动通过</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const lvl = reputationLevel(u.reputation);
              return (
                <tr key={u.id} className="border-b border-border align-top">
                  <td className="py-3">{u.display_name || u.id.slice(0, 8)}</td>
                  <td className="text-xs text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="tabular-nums">{u.reputation}</td>
                  <td className="text-xs text-muted-foreground">{lvl.label}</td>
                  <td className="text-xs">{u.auto_approve ? "✓" : "—"}</td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString("zh-CN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无用户</p>
        )}
      </section>
    </div>
  );
}
