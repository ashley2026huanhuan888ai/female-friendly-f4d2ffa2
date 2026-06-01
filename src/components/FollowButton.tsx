import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { followObject, unfollowObject, isFollowing } from "@/lib/api/observation-center.functions";

export function FollowButton({ objectId }: { objectId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const follow = useServerFn(followObject);
  const unfollow = useServerFn(unfollowObject);
  const check = useServerFn(isFollowing);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);
      try {
        const r = await check({ data: { object_id: objectId } });
        setFollowing(r.following);
      } finally { setLoading(false); }
    })();
  }, [objectId, check]);

  if (loading) return null;
  if (!signedIn) {
    return (
      <a href="/login" className="text-[11px] uppercase tracking-wider text-muted-foreground underline-offset-4 hover:underline">
        登录后关注
      </a>
    );
  }

  const toggle = async () => {
    setLoading(true);
    try {
      if (following) {
        await unfollow({ data: { object_id: objectId } });
        setFollowing(false); toast.success("已取消关注");
      } else {
        await follow({ data: { object_id: objectId } });
        setFollowing(true); toast.success("已加入观察列表");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  return (
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
  );
}
