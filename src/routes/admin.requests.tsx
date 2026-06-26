import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  approveObjectRequest,
  backfillApprovedRequests,
  rejectRequest,
} from "@/lib/api/platform.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  component: ReqAdmin,
});

function ReqAdmin() {
  const approve = useServerFn(approveObjectRequest);
  const reject = useServerFn(rejectRequest);
  const backfill = useServerFn(backfillApprovedRequests);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchNote, setBatchNote] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);

  const reload = () =>
    supabase
      .from("object_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setSelected(new Set());
      });
  useEffect(() => {
    reload();
  }, []);

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  const onBulkApprove = () => {
    if (selected.size === 0) {
      setSelected(new Set(items.map((i) => i.id)));
      return;
    }
    void runBatch("approve");
  };


  const runBatch = async (action: "approve" | "reject") => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `确认批量${action === "approve" ? "通过（含观察生成 + 温度重算）" : "驳回"} ${selected.size} 条？`,
      )
    )
      return;
    setBatchBusy(true);
    let ok = 0,
      fail = 0;
    for (const id of [...selected]) {
      try {
        if (action === "approve") {
          await approve({ data: { request_id: id } });
        } else {
          await reject({ data: { id, note: batchNote || undefined } });
        }
        ok++;
      } catch {
        fail++;
      }
    }
    setBatchBusy(false);
    toast.success(`批量${action === "approve" ? "通过" : "驳回"}完成：${ok} 成功 / ${fail} 失败`);
    setBatchNote("");
    reload();
  };

  const runBackfill = async () => {
    if (!confirm("将历史已通过、但没有对象卡片的申请补建为公开对象，确认继续？")) return;
    try {
      const r = await backfill();
      toast.success(`回填完成：扫描 ${r.scanned} · 补建 ${r.backfilled} · 跳过 ${r.skipped}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="container-prose py-12">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-3xl">对象申请</h1>
        <button
          onClick={runBackfill}
          className="border border-border px-3 py-1.5 text-xs hover:border-foreground"
        >
          回填缺失对象卡片
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-6 border border-dashed border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selected.size === items.length}
                onChange={toggleAll}
              />
              <span>
                全选（已选 {selected.size}/{items.length}）
              </span>
            </label>
            <input
              type="text"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="驳回备注（可选，应用于全部选中项）"
              className="min-w-[200px] flex-1 border border-border bg-background px-2 py-1"
            />
            <button
              onClick={onBulkApprove}
              disabled={batchBusy}
              className="border border-accent bg-accent px-6 py-3 text-base font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
            >
              批量通过并创建
            </button>

            <button
              onClick={() => runBatch("reject")}
              disabled={batchBusy || selected.size === 0}
              className="border border-destructive bg-destructive/10 px-3 py-1 text-destructive disabled:opacity-40"
            >
              批量驳回
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {items.map((r) => {
          const hasReason = (r.reason ?? "").trim().length > 0;
          return (
            <article key={r.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1.5"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSel(r.id)}
                  />
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {OBJECT_TYPE_LABELS[r.requested_type]}
                    </div>
                    <h3 className="mt-1 font-serif text-xl">{r.requested_name}</h3>
                    {r.reason && (
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                        {r.reason}
                      </p>
                    )}
                    {hasReason && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        申请说明仅供审核参考，通过后不会生成观察。
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await approve({ data: { request_id: r.id } });
                        toast.success("对象已创建（0 观察）");
                        reload();
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    className="border border-foreground bg-foreground px-4 py-1.5 text-xs text-background hover:bg-accent"
                  >
                    通过
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await reject({ data: { id: r.id } });
                        toast.success("已拒绝");
                        reload();
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    className="border border-border px-4 py-1.5 text-xs hover:border-foreground"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {items.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">无待审申请</p>
        )}
      </div>
    </div>
  );
}
