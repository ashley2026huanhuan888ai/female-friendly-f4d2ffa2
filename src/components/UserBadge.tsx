import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUserBadge } from "@/lib/api/contribution.functions";

const cache = new Map<string, { level: number; title: string; badge: string; points: number } | null>();

export function UserBadge({ userId, showTitle = true }: { userId: string; showTitle?: boolean }) {
  const fetchBadge = useServerFn(getUserBadge);
  const [b, setB] = useState<any>(cache.get(userId) ?? undefined);

  useEffect(() => {
    if (b !== undefined) return;
    fetchBadge({ data: { user_id: userId } }).then((r) => {
      cache.set(userId, r);
      setB(r);
    }).catch(() => setB(null));
  }, [userId, b, fetchBadge]);

  if (!b) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
      title={`L${b.level} · ${b.title} · ${Math.floor(b.points)}分`}
    >
      <span>{b.badge || "•"}</span>
      {showTitle && <span>L{b.level}</span>}
    </span>
  );
}
