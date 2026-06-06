import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { followObject, unfollowObject, isFollowing } from "@/lib/api/observation-center.functions";

export function FollowButton({ objectId }: { objectId: string }) {
  const { ready, user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const follow = useServerFn(followObject);
  const unfollow = useServerFn(unfollowObject);
  const check = useServerFn(isFollowing);
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await check({ data: { object_id: objectId } });
        if (!cancelled) setFollowing(r.following);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, objectId, check]);

  if (loading) return null;

  const toggle = async () => {
    if (!user) {
      setShowPrompt(true);
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await unfollow({ data: { object_id: objectId } });
        setFollowing(false);
        toast.success("已取消关注");
      } else {
        await follow({ data: { object_id: objectId } });
        setFollowing(true);
        toast.success("已加入观察列表");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const redirect = router.state.location.pathname;

  return (
    <>
      <button
        onClick={toggle}
        disabled={loading}
        className={`border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
          following
            ? "border-border text-muted-foreground hover:text-foreground"
            : "border-foreground bg-foreground text-background hover:bg-accent hover:border-accent"
        }`}
      >
        {following ? "✓ 已关注" : "+ 关注此对象"}
      </button>

      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="w-full max-w-md border border-border bg-paper p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              需要登录
            </div>
            <h3 className="mt-2 font-serif text-xl">登录后关注对象</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              登录后可以收藏对象，并查看温度变化提醒。
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                to="/login"
                search={{ redirect }}
                className="border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
              >
                登录并继续
              </Link>
              <button
                onClick={() => setShowPrompt(false)}
                className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
