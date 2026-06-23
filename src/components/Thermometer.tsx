import { bandOf } from "@/lib/temperature";
import { useI18n } from "@/lib/i18n";

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  unmeasured?: boolean;
}

const NUM_SIZE = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
} as const;

export function Thermometer({ value, size = "md", showLabel = true, unmeasured = false }: Props) {
  const { t, band: bandLabel } = useI18n();
  const numCls = NUM_SIZE[size];

  if (unmeasured) {
    return (
      <div className="flex flex-col">
        <div className={`font-serif tabular-nums ${numCls} text-muted-foreground`}>—</div>
        {showLabel && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("common.noTemperature")}
          </div>
        )}
      </div>
    );
  }

  const v = Math.max(20, Math.min(100, value));
  const band = bandOf(v);

  return (
    <div className="flex flex-col">
      <div
        className={`font-serif tabular-nums ${numCls}`}
        style={{ color: band.color }}
      >
        {v.toFixed(0)}
        <span className="ml-0.5 text-base text-muted-foreground">°C</span>
      </div>
      {showLabel && (
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {bandLabel(band.band, band.label)}
        </div>
      )}
    </div>
  );
}
