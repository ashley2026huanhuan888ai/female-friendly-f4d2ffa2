import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import { Thermometer } from "@/components/Thermometer";
import { getMyDashboard, markNotificationsRead } from "@/lib/api/observation-center.functions";
import { getMyProfile, updateMyProfile } from "@/lib/api/profile.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/me")({
  component: MePage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-prose py-20">{error.message}</div>
    </SiteLayout>
  ),
});

function MePage() {
  const { language, t, objectType } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { ready, user } = useAuth();
  const [tab, setTab] = useState<"watch" | "obs" | "notif">("watch");
  const fetchDash = useServerFn(getMyDashboard);
  const markRead = useServerFn(markNotificationsRead);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchDash()
      .then((d: any) => setData(d))
      .finally(() => setLoading(false));
  }, [ready, user, fetchDash]);

  const onMarkAll = async () => {
    await markRead({ data: {} });
    toast.success(t("me.markedRead"));
    fetchDash().then((d: any) => setData(d));
  };

  if (ready && !user) {
    return <LoginPrompt title={t("me.loginTitle")} body={t("me.loginBody")} redirect="/me" />;
  }

  if (loading || !data)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-12">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            My Observatory
          </div>
          <h1 className="mt-3 font-serif text-4xl">{t("me.title")}</h1>
          <ProfileEditor />
          <div className="mt-6 inline-flex border border-border">
            {(
              [
                ["watch", t("me.watch", { count: data.watching.length })],
                ["obs", t("me.observations", { count: data.my_observations.length })],
                [
                  "notif",
                  t("me.notifications", {
                    count: data.unread_count > 0 ? ` · ${data.unread_count}` : "",
                  }),
                ],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className={`px-4 py-2 text-xs uppercase tracking-wider ${
                  tab === k
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
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
          {tab === "watch" &&
            (data.watching.length === 0 ? (
              <Empty hint={t("me.emptyWatch")} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.watching.map((o: any) => (
                  <Link
                    key={o.id}
                    to="/objects/$id"
                    params={{ id: o.id }}
                    className="flex items-center justify-between border border-border bg-card p-4 hover:border-foreground/40"
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {objectType(o.type)}
                      </div>
                      <div className="mt-1 font-serif text-lg">{o.name}</div>
                    </div>
                    <Thermometer value={o.temperature} size="sm" showLabel={false} />
                  </Link>
                ))}
              </div>
            ))}

          {tab === "obs" &&
            (data.my_observations.length === 0 ? (
              <Empty hint={t("me.emptyObs")} />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {data.my_observations.map((o: any) => {
                  const inner = (
                    <>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <StatusChip status={o.status} />
                        <span>{o.object?.name ?? "—"}</span>
                        <span className="ml-auto">
                          {formatDateForLanguage(o.created_at, language)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{o.summary ?? t("common.noSummary")}</p>
                    </>
                  );
                  return (
                    <li key={o.id}>
                      {o.object?.id ? (
                        <Link
                          to="/objects/$id"
                          params={{ id: o.object.id }}
                          aria-label={`${t("objects.viewDetail")}: ${o.object.name}`}
                          className="block cursor-pointer py-4 transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="py-4">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}

          {tab === "notif" && (
            <>
              {data.unread_count > 0 && (
                <button onClick={onMarkAll} className="mb-4 text-xs underline">
                  {t("me.markAllRead")}
                </button>
              )}
              {data.notifications.length === 0 ? (
                <Empty hint={t("me.emptyNotif")} />
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {data.notifications.map((n: any) => (
                    <li key={n.id} className={`py-4 ${!n.read_at ? "bg-accent/5" : ""}`}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span className={n.kind === "temperature_up" ? "text-foreground" : ""}>
                          {n.kind === "temperature_up"
                            ? t("me.temperatureUp")
                            : n.kind === "temperature_down"
                              ? t("me.temperatureDown")
                              : n.kind}
                        </span>
                        <span className="ml-auto">
                          {formatDateForLanguage(n.created_at, language, {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mt-1 font-serif text-base">{n.title}</div>
                      {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                      {n.object && (
                        <Link
                          to="/objects/$id"
                          params={{ id: n.object.id }}
                          className="mt-2 inline-block text-xs underline"
                        >
                          {t("me.viewObject", { name: n.object.name })}
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
  return (
    <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      {hint}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, string> = {
    pending: t("me.status.pending"),
    approved: t("me.status.approved"),
    rejected: t("me.status.rejected"),
    auto_approved: t("me.status.auto_approved"),
  };
  return (
    <span className="border border-border px-1.5 py-0.5 text-[10px]">{map[status] ?? status}</span>
  );
}
