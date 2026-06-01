import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createObject, recomputeTemperature, freezeObject } from "@/lib/api/platform.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/objects")({
  component: ObjectsAdmin,
});

function ObjectsAdmin() {
  const create = useServerFn(createObject);
  const recompute = useServerFn(recomputeTemperature);
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", type: "brand", description: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () =>
    supabase.from("objects").select("*").order("updated_at", { ascending: false }).limit(100).then(({ data }) => setItems(data ?? []));
  useEffect(() => { reload(); }, []);

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">对象管理</h1>

      <section className="mt-8 border border-border bg-card p-6">
        <h2 className="text-sm font-medium">创建新对象</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await create({ data: { name: form.name, type: form.type as any, description: form.description || undefined } });
              toast.success("已创建"); setForm({ name: "", type: "brand", description: "" }); reload();
            } catch (err: any) { toast.error(err.message); }
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

      <section className="mt-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3">名称</th><th>类型</th><th className="text-right">温度</th><th className="text-right">观察</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-border">
                <td className="py-3">{o.name}</td>
                <td className="text-muted-foreground">{OBJECT_TYPE_LABELS[o.type]}</td>
                <td className="text-right tabular-nums">{Number(o.temperature).toFixed(0)}°</td>
                <td className="text-right tabular-nums text-muted-foreground">{o.observation_count}</td>
                <td className="text-right">
                  <button
                    disabled={busy === o.id}
                    onClick={async () => {
                      setBusy(o.id);
                      try { const r = await recompute({ data: { object_id: o.id } }); toast.success(`温度 ${r.temperature.toFixed(0)}°`); reload(); }
                      catch (err: any) { toast.error(err.message); }
                      finally { setBusy(null); }
                    }}
                    className="border border-border px-3 py-1 text-xs hover:border-foreground disabled:opacity-50"
                  >
                    {busy === o.id ? "AI…" : "重算温度"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">暂无对象</p>}
      </section>
    </div>
  );
}
