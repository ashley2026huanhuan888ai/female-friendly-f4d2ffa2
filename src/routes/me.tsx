import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { getMyDashboard, markNotificationsRead } from "@/lib/api/observation-center.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { toast } from "sonner";

export const Route = createFileRoute("/me")({
  component: MePage,
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container-prose py-20">{error.message}</div></SiteLayout>
  ),
});

function MePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"watch" | "obs" | "notif">("watch");
  const fetchDash = useServerFn(getMyDashboard);
  const markRead = useServerFn(markNotificationsRead);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { window.location.href = "/login"; return; }
      fetchDash().then((d) => setData(d)).finally(() => setLoading(false));
    })();
  }, [fetchDash]);

  const onMarkAll = async () => {
    await markRead({ data: {} });
    toast.success("已全部标记为已读");
    fetchDash().then((d) => setData(d));
  };

  if (loading || !data) return <SiteLayout><div className="container-prose py-32 text-center text-muted-foreground">加载中…</div></SiteLayout>;

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">My Observatory</div>
          <h1 className="mt-3 font-serif text-4xl">个人观察台</h1>
          <div className="mt-6 inline-flex border border-border">
            {([
              ["watch", `我的关注 (${data.watching.length})`],
              ["obs", `我的观察 (${data.my_observations.length})`],
              ["notif", `提醒${data.unread_count > 0 ? ` · ${data.unread_count}` : ""}`],
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
          {tab === "watch" && (
            data.watching.length === 0 ? (
              <Empty hint="尚未关注任何对象。点击对象详情页的「+ 关注」开始建立你的观察列表。" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.watching.map((o: any) => (
                  <Link
                    key={o.id} to="/objects/$id" params={{ id: o.id }}
                    className="flex items-center justify-between border border-border bg-card p-4 hover:border-foreground/40"
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {OBJECT_TYPE_LABELS[o.type] ?? o.type}
                      </div>
                      <div className="mt-1 font-serif text-lg">{o.name}</div>
                    </div>
                    <Thermometer value={o.temperature} size="sm" showLabel={false} />
                  </Link>
                ))}
              </div>
            )
          )}

          {tab === "obs" && (
            data.my_observations.length === 0 ? (
              <Empty hint="你还没有提交过观察。" />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {data.my_observations.map((o: any) => (
                  <li key={o.id} className="py-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <StatusChip status={o.status} />
                      <span>{o.object?.name ?? "—"}</span>
                      <span className="ml-auto">{new Date(o.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                    <p className="mt-1 text-sm">{o.summary ?? "（暂无摘要）"}</p>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "notif" && (
            <>
              {data.unread_count > 0 && (
                <button onClick={onMarkAll} className="mb-4 text-xs underline">全部标记为已读</button>
              )}
              {data.notifications.length === 0 ? (
                <Empty hint="暂无提醒。关注对象后，温度变化超过 3°C 时会出现在这里。" />
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {data.notifications.map((n: any) => (
                    <li key={n.id} className={`py-4 ${!n.read_at ? "bg-accent/5" : ""}`}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span className={n.kind === "temperature_up" ? "text-foreground" : ""}>
                          {n.kind === "temperature_up" ? "↑ 升温" : n.kind === "temperature_down" ? "↓ 降温" : n.kind}
                        </span>
                        <span className="ml-auto">{new Date(n.created_at).toLocaleString("zh-CN")}</span>
                      </div>
                      <div className="mt-1 font-serif text-base">{n.title}</div>
                      {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                      {n.object && (
                        <Link to="/objects/$id" params={{ id: n.object.id }} className="mt-2 inline-block text-xs underline">
                          查看 {n.object.name} →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Empty({ hint }: { hint: string }) {
  return <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">{hint}</div>;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "待审", approved: "已通过", rejected: "已驳回", auto_approved: "自动通过",
  };
  return <span className="border border-border px-1.5 py-0.5 text-[10px]">{map[status] ?? status}</span>;
}
