import { useI18n } from "@/lib/i18n";

interface Source {
  tag: string;
  delta: number;
  count: number;
}

export function HeatSources({ heat = [], cooling = [] }: { heat?: Source[]; cooling?: Source[] }) {
  const { t, tag } = useI18n();
  if (!heat.length && !cooling.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("heatSources.heat")}
        </div>
        {heat.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{t("heatSources.none")}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {heat.map((s) => (
              <li
                key={s.tag}
                className="flex items-center justify-between border-b border-border pb-1.5 text-sm"
              >
                <span>
                  {tag(s.tag)} <span className="text-[10px] text-muted-foreground">×{s.count}</span>
                </span>
                <span
                  className="font-mono text-xs tabular-nums"
                  style={{ color: "var(--temp-hot)" }}
                >
                  +{s.delta.toFixed(1)}°
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("heatSources.cooling")}
        </div>
        {cooling.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{t("heatSources.noPositive")}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {cooling.map((s) => (
              <li
                key={s.tag}
                className="flex items-center justify-between border-b border-border pb-1.5 text-sm"
              >
                <span>
                  {tag(s.tag)} <span className="text-[10px] text-muted-foreground">×{s.count}</span>
                </span>
                <span
                  className="font-mono text-xs tabular-nums"
                  style={{ color: "var(--temp-cool)" }}
                >
                  {s.delta.toFixed(1)}°
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
