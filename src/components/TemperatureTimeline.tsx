import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTemperatureTimeline } from "@/lib/api/temperature.functions";

interface Evt {
  id: string;
  delta: number;
  temperature_after: number;
  reason: string;
  note: string | null;
  observation_id: string | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  observation_approved: "观察通过 · 重算",
  manual_admin: "管理员手动重算",
  cooling_cycle: "自然冷却",
  positive_case: "正向案例",
};

export function TemperatureTimeline({
  objectId,
  limit = 30,
}: {
  objectId: string;
  limit?: number;
}) {
  const fetchTimeline = useServerFn(getTemperatureTimeline);
  const [events, setEvents] = useState<Evt[] | null>(null);

  useEffect(() => {
    fetchTimeline({ data: { object_id: objectId, limit } })
      .then((d) => setEvents(d as unknown as Evt[]))
      .catch(() => setEvents([]));
  }, [objectId, limit, fetchTimeline]);

  if (events === null) return <p className="text-sm text-muted-foreground">加载温度时间线…</p>;
  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">尚无温度变化记录。</p>;

  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const up = Number(e.delta) > 0;
        const flat = Number(e.delta) === 0;
        return (
          <li
            key={e.id}
            className="grid grid-cols-[110px_60px_1fr_70px] items-center gap-3 border-b border-border pb-3 text-sm"
          >
            <span className="font-mono text-[11px] text-muted-foreground">
              {new Date(e.created_at).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span
              className="text-center font-mono text-xs tabular-nums"
              style={{
                color: flat
                  ? "var(--muted-foreground)"
                  : up
                    ? "var(--temp-hot)"
                    : "var(--temp-cool)",
              }}
            >
              {up ? "+" : ""}
              {Number(e.delta).toFixed(1)}°
            </span>
            <span className="text-xs">
              {REASON_LABEL[e.reason] ?? e.reason}
              {e.note && <span className="ml-2 text-muted-foreground">· {e.note}</span>}
            </span>
            <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              → {Number(e.temperature_after).toFixed(1)}°
            </span>
          </li>
        );
      })}
    </ol>
  );
}
