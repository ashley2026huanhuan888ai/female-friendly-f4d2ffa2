import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { ObjectCard } from "@/components/ObjectCard";
import { useAuth } from "@/components/auth-context";
import { getPublicObjects, requestObjectFromSearch } from "@/lib/api/platform.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";

type ObjectsSearch = {
  q?: string;
  pending?: string;
  tag?: string;
  type?: string;
};

const OBJECT_TYPE_OPTIONS = [
  "brand",
  "product",
  "service",
  "organization",
  "film",
  "game",
  "show",
  "event",
] as const;

function isObjectType(value: unknown): value is (typeof OBJECT_TYPE_OPTIONS)[number] {
  return typeof value === "string" && (OBJECT_TYPE_OPTIONS as readonly string[]).includes(value);
}

export const Route = createFileRoute("/objects/")({
  validateSearch: (s: Record<string, unknown>): ObjectsSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    pending: typeof s.pending === "string" ? s.pending : undefined,
    tag: typeof s.tag === "string" ? s.tag : undefined,
    type: isObjectType(s.type) ? s.type : undefined,
  }),
  head: () => ({
    meta: [
      { title: "全部对象 · 女性友好体验测评" },
      { name: "description", content: "浏览所有评估对象，按温度排序，按类型筛选。" },
      { property: "og:title", content: "全部对象 · 女性友好体验测评" },
      { property: "og:description", content: "浏览所有评估对象，按温度排序，按类型筛选。" },
    ],
    links: [{ rel: "canonical", href: "/objects" }],
  }),
  component: AllObjects,
});

function AllObjects() {
  const { t, objectType, tag: tagLabel } = useI18n();
  usePageMeta("seo.objects.title", "seo.objects.description");
  const { q: initialQ, pending: pendingQ, tag: tagParam, type: typeParam } = Route.useSearch();
  const tagFilter = (tagParam ?? "").trim();
  const readableTag = tagFilter ? tagLabel(tagFilter) : "";
  const [qInput, setQInput] = useState(initialQ || pendingQ || "");
  const [q, setQ] = useState(initialQ || pendingQ || "");
  const [type, setType] = useState<string>(typeParam ?? "");
  const [sort, setSort] = useState<"temp" | "recent">("recent");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { ready, user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const requestFn = useServerFn(requestObjectFromSearch);
  const getObjects = useServerFn(getPublicObjects);

  useEffect(() => {
    const nextQ = initialQ || pendingQ || "";
    setQInput(nextQ);
    setQ(nextQ);
    setType(typeParam ?? "");
  }, [initialQ, pendingQ, tagFilter, typeParam]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getObjects({ data: { q, tag: tagFilter, type, sort, limit: 60 } })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : t("objects.loadFailed"));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, tagFilter, type, sort, getObjects, t]);

  // 登录后若带 pending 参数，自动继续申请
  useEffect(() => {
    if (!ready || !user || !pendingQ) return;
    handleRequest(pendingQ);
    navigate({ to: "/objects", search: { q: pendingQ, pending: "" }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, pendingQ]);

  async function handleRequest(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!user) {
      toast.info(t("objects.loginToRequest"));
      navigate({
        to: "/login",
        search: { redirect: `/objects?pending=${encodeURIComponent(trimmed)}` } as any,
      });
      return;
    }
    setRequesting(true);
    try {
      const res = await requestFn({ data: { name: trimmed } });
      if (res.status === "object_exists") {
        toast.success(t("objects.exists", { name: res.name }));
        navigate({ to: "/objects/$id", params: { id: res.objectId }, search: {} });
      } else if (res.status === "request_exists") {
        toast.info(t("objects.requestExists", { name: res.name }));
      } else if (res.status === "created") {
        toast.success(t("objects.created", { name: res.name }), {
          description: t("objects.createdDesc"),
        });
        router.invalidate();
      }
    } catch (e: any) {
      toast.error(e?.message || t("objects.requestFailed"));
    } finally {
      setRequesting(false);
    }
  }

  const searchedKeyword = q.trim();
  const showTagEmpty = !loading && Boolean(tagFilter) && items.length === 0;
  const showEmptyWithRequest = !tagFilter && !loading && searchedKeyword && items.length === 0;

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <h1 className="font-serif text-4xl">{t("objects.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("objects.description")}
            <Link to="/request-object" className="underline">
              {t("objects.requestLink")}
            </Link>
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({
                to: "/objects",
                search: {
                  q: qInput.trim() || undefined,
                  tag: tagFilter || undefined,
                  type: type || undefined,
                },
              });
            }}
            className="mt-10 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"
          >
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("objects.searchPlaceholder")}
              className="border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="">{t("objects.allTypes")}</option>
              {OBJECT_TYPE_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {objectType(k)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="temp">{t("objects.sortTemp")}</option>
              <option value="recent">{t("objects.sortRecent")}</option>
            </select>
            <button
              type="submit"
              className="border border-foreground bg-foreground px-5 py-2.5 text-sm text-background hover:bg-accent"
            >
              {t("common.search")}
            </button>
          </form>
          {tagFilter && (
            <div className="mt-6 border border-border bg-card p-4">
              <div className="font-serif text-xl">
                {t("objects.tagTitle", { tag: readableTag })}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("objects.tagBody", { tag: readableTag })}
              </p>
              <Link
                to="/objects"
                search={{ q: q || undefined, type: type || undefined }}
                className="mt-3 inline-block text-xs uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("objects.clearTag")}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : showTagEmpty ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {t("objects.noTagMatch", { tag: readableTag })}
            </p>
          ) : showEmptyWithRequest ? (
            <div className="border border-border bg-card p-8 text-center">
              <p className="font-serif text-2xl">
                {t("objects.emptyTitle", { keyword: searchedKeyword })}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                {t("objects.emptyBody")}
              </p>
              <button
                onClick={() => handleRequest(searchedKeyword)}
                disabled={requesting}
                className="mt-6 border border-foreground bg-foreground px-6 py-2.5 text-sm text-background hover:bg-accent disabled:opacity-50"
              >
                {requesting
                  ? t("objects.requesting")
                  : t("objects.requestKeyword", { keyword: searchedKeyword })}
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {t("common.noObjects")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((o: any) => (
                <ObjectCard key={o.id} {...o} showActions />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
