import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { ObjectCard } from "@/components/ObjectCard";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { useAuth } from "@/components/auth-context";
import { getPublicObjects, requestObjectFromSearch } from "@/lib/api/platform.functions";

type ObjectsSearch = {
  q?: string;
  pending?: string;
};

export const Route = createFileRoute("/objects/")({
  validateSearch: (s: Record<string, unknown>): ObjectsSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    pending: typeof s.pending === "string" ? s.pending : undefined,
  }),
  head: () => ({
    meta: [
      { title: "全部对象 · 女性友好体验测评" },
      { name: "description", content: "浏览所有评估对象，按温度排序，按类型筛选。" },
    ],
  }),
  component: AllObjects,
});

function AllObjects() {
  const { q: initialQ, pending: pendingQ } = Route.useSearch();
  const [qInput, setQInput] = useState(initialQ || pendingQ || "");
  const [q, setQ] = useState(initialQ || pendingQ || "");
  const [type, setType] = useState<string>("");
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
    let cancelled = false;
    setLoading(true);
    getObjects({ data: { q, type, sort, limit: 60 } })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "对象列表加载失败");
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, type, sort, getObjects]);

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
      toast.info("请先登录后再申请建立对象");
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
        toast.success(`对象「${res.name}」已存在，正在打开详情页`);
        navigate({ to: "/objects/$id", params: { id: res.objectId }, search: {} });
      } else if (res.status === "request_exists") {
        toast.info(`「${res.name}」已有人申请建立，正在等待审核`);
      } else if (res.status === "created") {
        toast.success(`已提交「${res.name}」的建立申请`, {
          description: "当前状态：等待管理员审核。审核通过后，你就可以为它提交观察并参与温度测评。",
        });
        router.invalidate();
      }
    } catch (e: any) {
      toast.error(e?.message || "申请失败，请稍后重试");
    } finally {
      setRequesting(false);
    }
  }

  const searchedKeyword = q.trim();
  const showEmptyWithRequest = !loading && searchedKeyword && items.length === 0;

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-16">
          <h1 className="font-serif text-4xl">全部对象</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            找不到？
            <Link to="/request-object" className="underline">
              增加新测评对象
            </Link>
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qInput);
            }}
            className="mt-10 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"
          >
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="按名称搜索"
              className="border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="">全部类型</option>
              {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="temp">温度从高到低</option>
              <option value="recent">最近更新</option>
            </select>
            <button
              type="submit"
              className="border border-foreground bg-foreground px-5 py-2.5 text-sm text-background hover:bg-accent"
            >
              搜索
            </button>
          </form>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>
          ) : showEmptyWithRequest ? (
            <div className="border border-border bg-card p-8 text-center">
              <p className="font-serif text-2xl">没有找到「{searchedKeyword}」</p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                你可以申请建立这个对象，审核通过后大家就能提交观察并参与温度测评。
              </p>
              <button
                onClick={() => handleRequest(searchedKeyword)}
                disabled={requesting}
                className="mt-6 border border-foreground bg-foreground px-6 py-2.5 text-sm text-background hover:bg-accent disabled:opacity-50"
              >
                {requesting ? "提交中…" : `申请建立「${searchedKeyword}」`}
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">暂无对象</p>
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
