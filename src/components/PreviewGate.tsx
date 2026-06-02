import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/components/AuthProvider";
import { Thermometer } from "@/components/Thermometer";
import { getPublicPreviewObjects } from "@/lib/api/platform.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

export const GUEST_NOTE = "未登录状态下仅展示 2 个公开预览对象。登录后可查看全部测评对象、完整温度榜与对象档案。";

export function GuestLoginPrompt({ className = "" }: { className?: string }) {
  return (
    <div className={`border border-dashed border-border bg-card/40 p-6 text-sm ${className}`}>
      <p className="text-muted-foreground">{GUEST_NOTE}</p>
      <Link to="/login" className="mt-3 inline-block border border-foreground bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent">
        登录 / 注册
      </Link>
    </div>
  );
}

export function usePreviewObjects() {
  const fetchPreview = useServerFn(getPublicPreviewObjects);
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    fetchPreview().then((r) => setItems(r.items ?? [])).catch(() => setItems([]));
  }, [fetchPreview]);
  return items;
}

export function GuestPreviewList() {
  const items = usePreviewObjects();
  if (items === null) return <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>;
  if (items.length === 0) return <p className="py-12 text-center text-sm text-muted-foreground">暂无公开预览对象。</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((o) => (
        <Link
          key={o.id} to="/objects/$id" params={{ id: o.id }}
          className="flex items-center justify-between gap-4 border border-border bg-card p-5 hover:border-foreground/40"
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {OBJECT_TYPE_LABELS[o.type] ?? o.type}
            </div>
            <div className="mt-1 font-serif text-xl">{o.name}</div>
            {o.ai_summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{o.ai_summary}</p>}
          </div>
          <Thermometer value={o.temperature} size="sm" showLabel={false} unmeasured={(o.observation_count ?? 0) === 0} />
        </Link>
      ))}
    </div>
  );
}

/** Returns true once auth is ready and there is no user. */
export function useIsGuest() {
  const { ready, user } = useAuth();
  return ready && !user;
}
