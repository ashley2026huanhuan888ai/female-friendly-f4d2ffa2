import { bandOf } from "@/lib/temperature";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function HeatRuler({
  value,
  compact = false,
  className,
}: {
  value: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const { t, band: bandLabel, language } = useI18n();
  const copy = heatRulerCopy[language];
  const measured = typeof value === "number" && Number.isFinite(value);
  const v = measured ? Math.max(20, Math.min(100, value)) : 20;
  const pct = measured ? ((v - 20) / 80) * 100 : 0;
  const band = bandOf(v);
  const ticks = [20, 35, 50, 65, 80, 100];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {copy.title}
          </div>
          <div className={cn("font-serif tabular-nums", compact ? "text-3xl" : "text-5xl")}>
            {measured ? v.toFixed(0) : "—"}
            <span className="ml-1 text-base text-muted-foreground">°C</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs uppercase tracking-wider archive-highlight">
            {measured ? bandLabel(band.band, band.label) : t("common.noTemperature")}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{copy.hint}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative h-9 border-b border-foreground/70">
          <div className="absolute inset-x-0 bottom-3 h-2 bg-muted">
            <div
              className="h-full"
              style={{
                width: `${measured ? pct : 0}%`,
                background:
                  "linear-gradient(to right, var(--temp-cool), var(--temp-warm), var(--archive-pink))",
              }}
            />
          </div>
          {ticks.map((tick) => {
            const left = ((tick - 20) / 80) * 100;
            return (
              <span
                key={tick}
                className="absolute bottom-0 h-5 w-px bg-foreground/50"
                style={{ left: `${left}%` }}
              />
            );
          })}
          {measured && (
            <span
              className="absolute bottom-0 h-8 w-2 -translate-x-1/2 border border-foreground bg-[var(--archive-pink)]"
              style={{ left: `${pct}%` }}
              aria-hidden
            />
          )}
        </div>
        <div className="mt-2 grid grid-cols-4 text-[10px] text-muted-foreground">
          <span>{copy.cool}</span>
          <span className="text-center">{copy.rising}</span>
          <span className="text-center">{copy.hot}</span>
          <span className="text-right archive-highlight">{copy.critical}</span>
        </div>
      </div>
    </div>
  );
}

const heatRulerCopy = {
  zh: {
    title: "女性友好温度",
    hint: "基于已审核文字观察",
    cool: "低温",
    rising: "升温",
    hot: "高温",
    critical: "烫伤级避雷",
  },
  en: {
    title: "Female-friendly temperature",
    hint: "Based on approved text observations",
    cool: "Low",
    rising: "Rising",
    hot: "High",
    critical: "Avoid",
  },
} as const;
