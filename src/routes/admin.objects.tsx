import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createObject, recomputeTemperature, freezeObject,
  hideObject, deleteObject, mergeObjects, updateObjectCategory,
} from "@/lib/api/platform.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/objects")({ component: ObjectsAdmin });

type Obj = {
  id: string; name: string; type: string; temperature: number;
  observation_count: number; frozen: boolean; hidden: boolean;
  merged_into: string | null; category: string | null;
};

function ObjectsAdmin() {
  const create = useServerFn(createObject);
  const recompute = useServerFn(recomputeTemperature);
  const freeze = useServerFn(freezeObject);
  const hide = useServerFn(hideObject);
  const del = useServerFn(deleteObject);
  const merge = useServerFn(mergeObjects);
  const updateCat = useServerFn(updateObjectCategory);

  const [items, setItems] = useState<Obj[]>([]);
  const [form, setForm] = useState({ name: "", type: "brand", description: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [manualTemp, setManualTemp] = useState<Record<string, string>>({});
  const [mergeTo, setMergeTo] = useState<Record<string, string>>({});

  const reload = () =>
    supabase.from("objects").select("*").order("updated_at", { ascending: false }).limit(200)
      .then(({ data }) => setItems((data ?? []) as Obj[]));
  useEffect(() => { reload(); }, []);

  const wrap = async (id: string, fn: () => Promise<unknown>, ok = "完成") => {
    try { setBusy(id); await fn(); toast.success(ok); reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">对象管理</h1>

      <section className="mt-8 border border-border bg-card p-6">
        <h2 className="text-sm font-medium">创建新对象</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create({ data: { name: form.name, type: form.type as never, description: form.description || undefined } });
              toast.success("已创建"); setForm({ name: "", type: "brand", description: "" }); reload();
            } catch (err) { toast.error((err as Error).message); }
          }}
          className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]"
        >
          <input required placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-border bg-background p-2.5 text-sm" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border border-border bg-background p-2.5 text-sm">
            {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="border border-foreground bg-foreground px-4 py-2 text-sm text-background hover:bg-accent">创建</button>
          <textarea placeholder="描述（可选）" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-border bg-background p-2.5 text-sm md:col-span-3" rows={2} />
        </form>
      </section>

      <section className="mt-10 space-y-4">
        {items.map((o) => (
          <div key={o.id} className="border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{o.name}</span>
              <select
                value={o.type}
                onChange={(e) => wrap(o.id, () => updateCat({ data: { object_id: o.id, type: e.target.value as never } }), "已更新类型")}
                className="border border-border bg-background px-1.5 py-0.5 text-xs"
              >
                {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {o.frozen && <span className="border border-accent px-1.5 py-0.5 text-[10px] text-accent">冻结</span>}
              {o.hidden && <span className="border border-temp-warm px-1.5 py-0.5 text-[10px] text-temp-warm">隐藏</span>}
              {o.merged_into && <span className="border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">已合并</span>}
              <span className="ml-auto text-sm tabular-nums">{Number(o.temperature).toFixed(0)}°</span>
              <span className="text-xs text-muted-foreground">· {o.observation_count} 条</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button disabled={busy === o.id || o.frozen}
                onClick={() => wrap(o.id, async () => {
                  const r = await recompute({ data: { object_id: o.id } });
                  toast.success(`温度 ${r.temperature.toFixed(0)}°`);
                }, "")}
                className="border border-border px-3 py-1 text-xs hover:border-foreground disabled:opacity-40">
                {busy === o.id ? "AI…" : "重算"}
              </button>
              <button disabled={busy === o.id}
                onClick={() => wrap(o.id, () => freeze({ data: { object_id: o.id, frozen: !o.frozen } }), o.frozen ? "已解冻" : "已冻结")}
                className="border border-border px-3 py-1 text-xs hover:border-foreground">
                {o.frozen ? "解冻" : "冻结"}
              </button>
              <button disabled={busy === o.id}
                onClick={() => wrap(o.id, () => hide({ data: { object_id: o.id, hidden: !o.hidden } }), o.hidden ? "已显示" : "已隐藏")}
                className="border border-border px-3 py-1 text-xs hover:border-foreground">
                {o.hidden ? "取消隐藏" : "隐藏"}
              </button>
              <button disabled={busy === o.id}
                onClick={() => {
                  if (!confirm(`删除对象「${o.name}」及其全部观察？不可撤销`)) return;
                  wrap(o.id, () => del({ data: { object_id: o.id } }), "已删除");
                }}
                className="border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/5">
                删除
              </button>
              <input type="number" min={20} max={100} placeholder="手动温度"
                value={manualTemp[o.id] ?? ""}
                onChange={(e) => setManualTemp({ ...manualTemp, [o.id]: e.target.value })}
                className="w-24 border border-border bg-background px-2 py-1 text-xs" />
              <button onClick={() => {
                const v = Number(manualTemp[o.id]);
                if (!v || v < 20 || v > 100) return toast.error("温度需在 20-100");
                wrap(o.id, () => recompute({ data: { object_id: o.id, manual_temperature: v } }), "已设定");
                setManualTemp({ ...manualTemp, [o.id]: "" });
              }}
                className="border border-border px-3 py-1 text-xs hover:border-foreground">设定</button>
              <select value={mergeTo[o.id] ?? ""} onChange={(e) => setMergeTo({ ...mergeTo, [o.id]: e.target.value })}
                className="border border-border bg-background px-2 py-1 text-xs">
                <option value="">合并到…</option>
                {items.filter(x => x.id !== o.id && !x.merged_into).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <button onClick={() => {
                const t = mergeTo[o.id]; if (!t) return toast.error("选择目标对象");
                if (!confirm(`将「${o.name}」合并到目标？源对象会被隐藏`)) return;
                wrap(o.id, () => merge({ data: { source_id: o.id, target_id: t } }), "已合并");
              }}
                className="border border-border px-3 py-1 text-xs hover:border-foreground">合并</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">暂无对象</p>}
      </section>
    </div>
  );
}
