import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getTemperatureDashboard,
  recomputeObjectTemperature,
  runCoolingCycle,
  getTemperatureExplanation,
  scanAndFixTemperatures,
} from "@/lib/api/temperature.functions";
import { TemperatureBreakdown } from "@/components/TemperatureBreakdown";
import { HeatSources } from "@/components/HeatSources";
import { TemperatureTimeline } from "@/components/TemperatureTimeline";

export const Route = createFileRoute("/admin/temperature")({
  head: () => ({ meta: [{ title: "温度计算中心 · 管理后台" }] }),
  component: TemperatureCenter,
});

interface Row { id: string; name: string; type: string; temperature: number; observation_count?: number; delta_30d?: number }

function TemperatureCenter() {
  const fetchDashboard = useServerFn(getTemperatureDashboard);
  const recompute = useServerFn(recomputeObjectTemperature);
  const cool = useServerFn(runCoolingCycle);
  const fetchExpl = useServerFn(getTemperatureExplanation);
  const scan = useServerFn(scanAndFixTemperatures);

  const [data, setData] = useState<{
    top_hot: Row[]; controversial: Row[]; top_heat_30d: Row[]; top_cool_30d: Row[];
  } | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [expl, setExpl] = useState<{ breakdown: unknown; object: { heat_sources?: unknown; cooling_sources?: unknown } } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetchDashboard({}).then((d) => setData(d as never));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) { setExpl(null); return; }
    fetchExpl({ data: { object_id: selected.id } }).then((d) => setExpl(d as never));
  }, [selected, fetchExpl]);

  const Section = ({ title, rows, showDelta }: { title: string; rows: Row[]; showDelta?: boolean }) => (
    <div className="border border-border bg-card p-5">
      <h3 className="font-serif text-lg">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">暂无数据</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <button onClick={() => setSelected(r)} className="flex-1 text-left hover:text-accent">
                <span>{r.name}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">{r.type}</span>
              </button>
              {showDelta && r.delta_30d !== undefined && (
                <span className="font-mono text-xs tabular-nums" style={{ color: r.delta_30d >= 0 ? "var(--temp-hot)" : "var(--temp-cool)" }}>
                  {r.delta_30d > 0 ? "+" : ""}{Number(r.delta_30d).toFixed(1)}°
                </span>
              )}
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{Number(r.temperature).toFixed(1)}°</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="container-prose py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">温度计算中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            每一次温度变化都有依据 · 可追溯 · 可解释 · 可复核
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setBusy(true);
              try {
                const r = await scan({}) as { initial_legal_low: number; fixed: number; remaining_legal_low: number; remaining_phantom_comfort: number };
                toast.success(`扫描完成：违规 ${r.initial_legal_low} → 修复 ${r.fixed} → 剩余 ${r.remaining_legal_low}（异常舒适 ${r.remaining_phantom_comfort}）`);
                load();
              } catch (e) { toast.error((e as Error).message); }
              finally { setBusy(false); }
            }}
            disabled={busy}
            className="border border-foreground px-4 py-2 text-xs hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            扫描并修复违规温度
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              try { const r = await cool({}); toast.success(`本轮自然冷却完成：${(r as { cooled: number }).cooled} 个对象`); load(); }
              catch (e) { toast.error((e as Error).message); }
              finally { setBusy(false); }
            }}
            disabled={busy}
            className="border border-foreground px-4 py-2 text-xs hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            运行 30 天自然冷却周期
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Section title="温度排行榜 Top 10" rows={data?.top_hot ?? []} />
        <Section title="争议最高（≥60°，按观察数）" rows={data?.controversial ?? []} />
        <Section title="近 30 天升温最快" rows={data?.top_heat_30d ?? []} showDelta />
        <Section title="近 30 天降温最快（含正向改善）" rows={data?.top_cool_30d ?? []} showDelta />
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-background/80 md:items-stretch">
          <div className="h-full w-full overflow-y-auto border-l border-border bg-background p-6 md:max-w-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">关闭 ✕</button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              当前 {Number(selected.temperature).toFixed(1)}° · {selected.type}
            </div>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await recompute({ data: { object_id: selected.id } }) as { temperature: number; delta: number };
                  toast.success(`已重算：${r.temperature.toFixed(1)}°（${r.delta > 0 ? "+" : ""}${r.delta.toFixed(1)}°）`);
                  load();
                  fetchExpl({ data: { object_id: selected.id } }).then((d) => setExpl(d as never));
                } catch (e) { toast.error((e as Error).message); }
                finally { setBusy(false); }
              }}
              disabled={busy}
              className="mt-4 border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:bg-accent disabled:opacity-50"
            >
              重算温度
            </button>

            <div className="mt-6">
              <TemperatureBreakdown data={(expl?.breakdown as never) ?? null} />
            </div>
            <div className="mt-6">
              <HeatSources
                heat={(expl?.object?.heat_sources as never) ?? []}
                cooling={(expl?.object?.cooling_sources as never) ?? []}
              />
            </div>
            <div className="mt-6">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">温度时间线</h3>
              <div className="mt-3">
                <TemperatureTimeline objectId={selected.id} limit={50} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
