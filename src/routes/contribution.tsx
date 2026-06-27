import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import { getMyContribution } from "@/lib/api/contribution.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/contribution")({
  head: () => ({ meta: [{ title: "我的贡献积分 · 女性友好" }] }),
  component: ContributionPage,
});

const kindLabel: Record<string, string> = {
  observation_temp: "观察提温",
  invite_signup: "邀请注册",
  referral_bonus: "下线返利",
  share_view: "分享查看",
  admin_adjust: "管理员调整",
};

function ContributionPage() {
  const { ready, user } = useAuth();
  const fetchData = useServerFn(getMyContribution);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"overview" | "events" | "invite">("overview");

  useEffect(() => {
    if (!ready || !user) return;
    fetchData().then(setData);
  }, [ready, user, fetchData]);

  if (ready && !user) {
    return <LoginPrompt title="查看贡献积分" body="登录后即可看到你的积分、等级和邀请数据" redirect="/contribution" />;
  }
  if (!data) {
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">加载中…</div>
      </SiteLayout>
    );
  }

  const { profile, points, level, next, progress, events, directInvites, tierCounts, totalReferralPoints, levels } = data;
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/login?ref=${profile.invite_code}`
    : `/login?ref=${profile.invite_code}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制");
  };

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Contribution</div>
          <h1 className="mt-3 font-serif text-4xl">贡献积分</h1>

          {/* 积分卡片 */}
          <div className="mt-6 border border-border bg-card p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">当前等级</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-3xl">{level?.badge}</span>
                  <span className="font-serif text-2xl">L{level?.level} · {level?.title}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">总积分</div>
                <div className="mt-1 font-serif text-4xl text-accent">{points.toFixed(2)}</div>
              </div>
            </div>
            {next && (
              <div className="mt-5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>下一级：L{next.level} · {next.title}</span>
                  <span>还差 {(Number(next.min_points) - points).toFixed(2)} 分</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 inline-flex border border-border">
            {([
              ["overview", "概览"],
              ["events", `积分明细 (${events.length})`],
              ["invite", `我的邀请 (${directInvites.length})`],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className={`px-4 py-2 text-xs uppercase tracking-wider ${
                  tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {tab === "overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-border bg-card p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">如何获得积分</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>· 你的观察让对象温度上升：<strong>每 10°C 得 1 分</strong>（按线性比例）</li>
                  <li>· 朋友通过你的邀请码注册：<strong>+5 分</strong></li>
                  <li>· 下线获得积分时持续返利：L1 +10%，L2 +10%，L3 +10%</li>
                </ul>
                <div className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">邀请贡献累计</div>
                <div className="mt-1 font-serif text-2xl text-accent">{totalReferralPoints.toFixed(2)} 分</div>
              </div>

              <div className="border border-border bg-card p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">等级阶梯</div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {levels.map((l: any) => (
                    <li
                      key={l.level}
                      className={`flex items-center justify-between ${
                        l.level === level?.level ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span>{l.badge} L{l.level} · {l.title}</span>
                      <span>≥ {Number(l.min_points)} 分</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === "events" && (
            events.length === 0 ? (
              <Empty hint="还没有积分记录，发布一次观察试试" />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {events.map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {kindLabel[e.kind] ?? e.kind}
                        {e.depth ? ` · L${e.depth}` : ""}
                      </div>
                      <div className="mt-0.5">{e.reason || "—"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className={`font-serif text-lg ${Number(e.delta) >= 0 ? "text-accent" : "text-destructive"}`}>
                      {Number(e.delta) >= 0 ? "+" : ""}{Number(e.delta).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "invite" && (
            <div className="space-y-6">
              <div className="border border-border bg-card p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">我的邀请码</div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-2xl tracking-widest text-accent">{profile.invite_code}</span>
                  <button onClick={() => copy(profile.invite_code)} className="border border-border px-2 py-1 text-xs hover:border-foreground">
                    复制码
                  </button>
                  <button onClick={() => copy(inviteUrl)} className="border border-border px-2 py-1 text-xs hover:border-foreground">
                    复制邀请链接
                  </button>
                </div>
                <div className="mt-3 break-all text-xs text-muted-foreground">{inviteUrl}</div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[1, 2, 3].map((d) => (
                    <div key={d} className="border border-border p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">L{d} 下线</div>
                      <div className="mt-1 font-serif text-2xl">{tierCounts[d] ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">直接邀请的朋友</div>
                {directInvites.length === 0 ? (
                  <Empty hint="还没有朋友通过你的邀请码注册" />
                ) : (
                  <ul className="divide-y divide-border border-y border-border">
                    {directInvites.map((u: any) => (
                      <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full border border-border object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full border border-border bg-card" />
                          )}
                          <div>
                            <div className="text-sm">{u.display_name ?? u.id.slice(0, 8)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{Number(u.contribution_points).toFixed(0)} 分</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="mt-10 text-xs text-muted-foreground">
            <Link to="/leaderboard" className="underline hover:text-foreground">
              查看全站排行榜 →
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">{hint}</div>
  );
}
