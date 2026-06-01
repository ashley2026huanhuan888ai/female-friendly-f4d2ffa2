import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createObject, rejectRequest } from "@/lib/api/platform.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  component: ReqAdmin,
});

function ReqAdmin() {
  const create = useServerFn(createObject);
  const reject = useServerFn(rejectRequest);
  const [items, setItems] = useState<any[]>([]);

  const reload = () =>
    supabase.from("object_requests").select("*").eq("status", "pending").order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  useEffect(() => { reload(); }, []);

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">对象申请</h1>
      <div className="mt-8 space-y-3">
        {items.map((r) => (
          <article key={r.id} className="border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{OBJECT_TYPE_LABELS[r.requested_type]}</div>
                <h3 className="mt-1 font-serif text-xl">{r.requested_name}</h3>
                {r.reason && <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await create({ data: { name: r.requested_name, type: r.requested_type, request_id: r.id } });
                      toast.success("对象已创建"); reload();
                    } catch (e: any) { toast.error(e.message); }
                  }}
                  className="border border-foreground bg-foreground px-4 py-1.5 text-xs text-background hover:bg-accent"
                >
                  批准并创建
                </button>
                <button
                  onClick={async () => {
                    try { await reject({ data: { id: r.id } }); toast.success("已拒绝"); reload(); }
                    catch (e: any) { toast.error(e.message); }
                  }}
                  className="border border-border px-4 py-1.5 text-xs hover:border-foreground"
                >
                  拒绝
                </button>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">无待审申请</p>}
      </div>
    </div>
  );
}
