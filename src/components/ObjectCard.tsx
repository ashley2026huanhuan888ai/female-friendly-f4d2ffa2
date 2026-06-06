import { Link } from "@tanstack/react-router";
import { Thermometer } from "./Thermometer";
import { FollowButton } from "./FollowButton";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

interface Props {
  id: string;
  name: string;
  type: string;
  temperature: number;
  observation_count: number;
  ai_summary?: string | null;
  top_tags?: { tag: string; count: number }[] | null;
  heat_sources?: { label?: string; title?: string }[] | null;
  cooling_sources?: { label?: string; title?: string }[] | null;
  updated_at?: string | null;
  showActions?: boolean;
}

function relTime(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return "今天";
  if (d === 1) return "昨天";
  if (d < 30) return `${d} 天前`;
  if (d < 365) return `${Math.floor(d / 30)} 个月前`;
  return `${Math.floor(d / 365)} 年前`;
}

export function ObjectCard({
  id,
  name,
  type,
  temperature,
  observation_count,
  ai_summary,
  top_tags,
  heat_sources,
  cooling_sources,
  updated_at,
  showActions = false,
}: Props) {
  const tags = (top_tags ?? []).slice(0, 3);
  const heatTop = heat_sources?.[0];
  const coolTop = cooling_sources?.[0];
  const updated = relTime(updated_at);
  const heatLabel = heatTop?.label ?? heatTop?.title;
  const coolLabel = coolTop?.label ?? coolTop?.title;

  return (
    <article className="group border border-border bg-card transition-all hover:border-foreground/40 hover:shadow-sm focus-within:border-foreground/60">
      <Link
        to="/objects/$id"
        params={{ id }}
        aria-label={`查看对象详情：${name}`}
        className="flex items-start justify-between gap-6 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="pointer-events-none min-w-0 flex-1">
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {OBJECT_TYPE_LABELS[type] ?? type}
            </div>
            <h3 className="mt-2 font-serif text-2xl leading-tight text-balance group-hover:text-accent">
              {name}
            </h3>
            {ai_summary && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{ai_summary}</p>
            )}

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t.tag}
                    className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    #{t.tag}
                  </span>
                ))}
              </div>
            )}

            {(heatLabel || coolLabel) && (
              <div className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
                {heatLabel && (
                  <div>
                    <span className="text-[var(--temp-hot,#c1440e)]">▲</span> 主要热源：{heatLabel}
                  </div>
                )}
                {coolLabel && (
                  <div>
                    <span className="text-[var(--temp-cool,#2563eb)]">▼</span> 主要降温：{coolLabel}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{observation_count} 条观察</span>
              {updated && <span>· 更新于 {updated}</span>}
            </div>
          </div>
        </div>

        <Thermometer value={temperature} size="sm" unmeasured={observation_count === 0} />
      </Link>

      {showActions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4">
          <Link
            to="/submit/$objectId"
            params={{ objectId: id }}
            className="border border-foreground bg-foreground px-3 py-1.5 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
          >
            提交观察
          </Link>
          <FollowButton objectId={id} />
        </div>
      )}
    </article>
  );
}
