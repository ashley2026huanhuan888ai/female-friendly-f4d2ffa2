import { Link } from "@tanstack/react-router";
import { Thermometer } from "./Thermometer";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

interface Props {
  id: string;
  name: string;
  type: string;
  temperature: number;
  observation_count: number;
  ai_summary?: string | null;
}

export function ObjectCard({ id, name, type, temperature, observation_count, ai_summary }: Props) {
  return (
    <Link
      to="/objects/$id"
      params={{ id }}
      aria-label={`查看对象详情：${name}`}
      className="group block cursor-pointer border border-border bg-card p-6 transition-all hover:border-foreground/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            {OBJECT_TYPE_LABELS[type] ?? type}
          </div>
          <h3 className="mt-2 font-serif text-2xl leading-tight text-balance group-hover:text-accent">
            {name}
          </h3>
          {ai_summary && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{ai_summary}</p>
          )}
          <div className="mt-4 text-xs text-muted-foreground">
            {observation_count} 条观察
          </div>
        </div>
        <Thermometer value={temperature} size="sm" unmeasured={observation_count === 0} />
      </div>
    </Link>
  );
}
