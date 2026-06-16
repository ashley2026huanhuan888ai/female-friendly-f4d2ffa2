import { bandOf } from "@/lib/temperature";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ArchiveStamp } from "./ArchiveStamp";
import { HeatRuler } from "./HeatRuler";

export function TemperatureVerdict({
  value,
  compact = false,
  className,
}: {
  value: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const { t, band: bandLabel, language } = useI18n();
  const measured = typeof value === "number" && Number.isFinite(value);
  const v = measured ? Math.max(20, Math.min(100, value)) : null;
  const band = v == null ? null : bandOf(v);
  const copy = language === "en" ? enCopy : zhCopy;

  return (
    <div className={cn("border border-foreground/70 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {copy.title}
          </div>
          <div
            className={cn(
              "mt-1 font-serif tabular-nums archive-highlight",
              compact ? "text-4xl" : "text-6xl",
            )}
          >
            {v == null ? "—" : v.toFixed(0)}
            <span className="ml-1 text-lg text-muted-foreground">°C</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {band ? bandLabel(band.band, band.label) : t("common.noTemperature")}
          </div>
        </div>
        <ArchiveStamp className="archive-stamp-soft rotate-[-3deg] text-[11px]">
          {!measured
            ? t("common.noTemperature")
            : band?.band === "critical" || band?.band === "high"
              ? copy.warning
              : copy.recorded}
        </ArchiveStamp>
      </div>
      <HeatRuler value={v ?? null} compact className="mt-4" />
    </div>
  );
}

const zhCopy = {
  title: "温度判定 / Temperature result",
  warning: "高温警告",
  recorded: "已记录",
};

const enCopy = {
  title: "Temperature result",
  warning: "High heat warning",
  recorded: "Archived",
};
