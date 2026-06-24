import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { followUser, getFollowStatus, unfollowUser } from "@/lib/api/follows.functions";
import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/lib/i18n";

export function FollowButton({
  userId,
  onChange,
}: {
  userId: string;
  onChange?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const getStatus = useServerFn(getFollowStatus);
  const follow = useServerFn(followUser);
  const unfollow = useServerFn(unfollowUser);
  const [status, setStatus] = useState<{ following: boolean; followed_by: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.id === userId) return;
    getStatus({ data: { user_id: userId } })
      .then((s) => setStatus({ following: s.following, followed_by: s.followed_by }))
      .catch(() => {});
  }, [user, userId, getStatus]);

  if (!user || user.id === userId || !status) return null;

  const label = status.following
    ? status.followed_by
      ? t("follow.mutual")
      : t("follow.following")
    : t("follow.follow");

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status.following) {
        await unfollow({ data: { user_id: userId } });
        setStatus({ ...status, following: false });
        toast.success(t("follow.unfollowed"));
      } else {
        await follow({ data: { user_id: userId } });
        setStatus({ ...status, following: true });
        toast.success(t("follow.followed"));
      }
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message ?? "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`border px-3 py-1 text-xs ${
        status.following
          ? "border-border text-muted-foreground hover:text-foreground"
          : "border-foreground bg-foreground text-background"
      } disabled:opacity-60`}
    >
      {label}
    </button>
  );
}
