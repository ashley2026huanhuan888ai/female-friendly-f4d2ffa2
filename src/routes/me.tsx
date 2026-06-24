import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import { Thermometer } from "@/components/Thermometer";
import { UserFollowButton } from "@/components/UserFollowButton";
import { getMyDashboard, markNotificationsRead } from "@/lib/api/observation-center.functions";
import { getMyProfile, updateMyProfile } from "@/lib/api/profile.functions";
import { listMyFollowers, listMyFollowing } from "@/lib/api/follows.functions";
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
  const [tab, setTab] = useState<"watch" | "obs" | "notif" | "relations">("watch");
  const [editingProfile, setEditingProfile] = useState(false);
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
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-serif text-4xl">{t("me.title")}</h1>
            <button
              onClick={() => setEditingProfile(true)}
              className="shrink-0 border border-foreground/60 px-3 py-1.5 text-xs hover:border-foreground"
            >
              {t("profile.edit")}
            </button>
          </div>
          {editingProfile && <ProfileEditor onClose={() => setEditingProfile(false)} />}

          <div className="mt-4">
            <Link
              to="/contribution"
              className="inline-flex items-center gap-2 border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs text-accent hover:bg-accent hover:text-background"
            >
              我的贡献积分 / 邀请好友 →
            </Link>
          </div>

          <MyTags tags={data.my_tags ?? []} />

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
                ["relations", t("me.followers") + " / " + t("me.following")],
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

          {tab === "relations" && <RelationsPanel />}
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

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchProfile()
      .then((p: any) => {
        if (!p) return;
        setDisplayName(p.display_name ?? "");
        setBio(p.bio ?? "");
        setAvatarUrl(p.avatar_url ?? "");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveProfile({
        data: {
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim() || null,
        },
      });
      toast.success(t("profile.saved"));
      onClose();
    } catch (e) {
      toast.error((e as Error).message || t("profile.saveFailed"), {
        action: { label: t("common.retry"), onClick: () => onSave() },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {t("profile.title")}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("profile.hint")}</p>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{t("profile.displayName")}</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder={t("profile.displayNamePlaceholder")}
              className="border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{t("profile.bio")}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              placeholder={t("profile.bioPlaceholder")}
              className="min-h-[72px] resize-y border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <div className="grid gap-2 text-xs">
            <span className="text-muted-foreground">{t("profile.avatarUrl")}</span>
            <AvatarPicker value={avatarUrl || null} onChange={(v) => setAvatarUrl(v ?? "")} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving}
              className="border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:bg-accent hover:border-accent disabled:opacity-50"
            >
              {saving ? t("profile.saving") : t("profile.save")}
            </button>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("profile.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function MyTags({ tags }: { tags: { tag: string; count: number }[] }) {
  const { t, tag: tagLabel } = useI18n();
  if (!tags || tags.length === 0) {
    return (
      <div className="mt-6 border border-border bg-card p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("me.myTags")}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("me.noTags")}</p>
      </div>
    );
  }
  const max = tags[0]?.count ?? 1;
  const min = tags[tags.length - 1]?.count ?? 1;
  const range = Math.max(max - min, 1);
  return (
    <div className="mt-6 border border-border bg-card p-5">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {t("me.myTags")}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        {tags.map((tt) => {
          const ratio = (tt.count - min) / range;
          const tier = ratio > 0.75 ? 0 : ratio > 0.5 ? 1 : ratio > 0.25 ? 2 : 3;
          const cls = [
            "text-2xl font-semibold text-foreground",
            "text-xl font-semibold text-foreground/90",
            "text-base font-medium text-foreground/75",
            "text-sm text-muted-foreground",
          ][tier];
          return (
            <Link
              key={tt.tag}
              to="/topics/$tag"
              params={{ tag: tt.tag }}
              className={`leading-tight hover:underline ${cls}`}
            >

              {tagLabel(tt.tag)}
              <span className="ml-1 text-[10px] text-muted-foreground align-baseline">
                ·{tt.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


function RelationsPanel() {
  const { t } = useI18n();
  const fetchFollowing = useServerFn(listMyFollowing);
  const fetchFollowers = useServerFn(listMyFollowers);
  const [following, setFollowing] = useState<any[] | null>(null);
  const [followers, setFollowers] = useState<any[] | null>(null);

  const reload = () => {
    fetchFollowing().then(setFollowing).catch(() => setFollowing([]));
    fetchFollowers().then(setFollowers).catch(() => setFollowers([]));
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderList = (items: any[] | null) => {
    if (items === null)
      return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
    if (items.length === 0)
      return <Empty hint={t("userFollow.empty")} />;
    return (
      <ul className="divide-y divide-border border-y border-border">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-3">
            <Link
              to="/messages/$peerId"
              params={{ peerId: u.id }}
              className="flex items-center gap-3 hover:text-foreground"
            >
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full border border-border bg-card" />
              )}
              <span className="text-sm">{u.display_name ?? u.id.slice(0, 8)}</span>
            </Link>
            <UserFollowButton userId={u.id} onChange={reload} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("me.following")}
        </div>
        {renderList(following)}
      </div>
      <div>
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("me.followers")}
        </div>
        {renderList(followers)}
      </div>
    </div>
  );
}
