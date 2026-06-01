import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { reviewObservation, recomputeTemperature } from "@/lib/api/platform.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/observations")({
  component: ObsAdmin,
});

function ObsAdmin() {
  const review = useServerFn(reviewObservation);
  const recompute = useServerFn(recomputeTemperature);
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const reload = () =>
    supabase.from("observations")
      .select("*, objects(id,name)")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setItems(data ?? []));
  useEffect(() => { reload(); }, [filter]);

  const act = async (id: string, objectId: string, action: "approve" | "reject") => {
    try {
      await review({ data: { id, action } });
      toast.success(action === "approve" ? "已通过" : "已拒绝");
      if (action === "approve") {
        recompute({ data: { object_id: objectId } }).catch(() => {});
      }
      reload();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">观察审核</h1>
      <div className="mt-6 flex gap-2 text-sm">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`border px-3 py-1.5 ${filter === s ? "border-foreground bg-foreground text-background" : "border-border"}`}>
            {s === "pending" ? "待审" : s === "approved" ? "已通过" : "已拒绝"}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {items.map((o) => (
          <article key={o.id} className="border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{o.objects?.name}</span>
              <span>·</span>
              <span className="border border-border px-1.5 py-0.5">证据 {o.evidence_level ?? "—"}</span>
              {(o.tags as string[])?.map((t) => <span key={t} className="text-accent">#{t}</span>)}
              <span className="ml-auto">{new Date(o.created_at).toLocaleString("zh-CN")}</span>
            </div>
            {o.cleaned_content && (
              <p className="mt-3 text-sm leading-relaxed">{o.cleaned_content}</p>
            )}
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">原文 · 场景 · 链接</summary>
              <div className="mt-2 space-y-1">
                <div><strong>原文：</strong>{o.content}</div>
                {o.scene && <div><strong>场景：</strong>{o.scene}</div>}
                {o.screenshot_url && <div><strong>截图：</strong><a href={o.screenshot_url} target="_blank" className="underline">{o.screenshot_url}</a></div>}
                {o.reference_url && <div><strong>参考：</strong><a href={o.reference_url} target="_blank" className="underline">{o.reference_url}</a></div>}
              </div>
            </details>
            {filter === "pending" && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => act(o.id, o.object_id, "approve")}
                  className="border border-foreground bg-foreground px-4 py-1.5 text-xs text-background hover:bg-accent">通过</button>
                <button onClick={() => act(o.id, o.object_id, "reject")}
                  className="border border-border px-4 py-1.5 text-xs hover:border-foreground">拒绝</button>
              </div>
            )}
          </article>
        ))}
        {items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">无记录</p>}
      </div>
    </div>
  );
}
