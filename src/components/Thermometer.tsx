import { bandOf } from "@/lib/temperature";

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function Thermometer({ value, size = "md", showLabel = true }: Props) {
  const v = Math.max(20, Math.min(100, value));
  const pct = ((v - 20) / 80) * 100;
  const band = bandOf(v);

  const dims = {
    sm: { w: 28, h: 110, num: "text-base" },
    md: { w: 40, h: 180, num: "text-2xl" },
    lg: { w: 56, h: 260, num: "text-4xl" },
  }[size];

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative overflow-hidden rounded-full border border-border bg-subtle"
        style={{ width: dims.w, height: dims.h }}
      >
        <div
          className="absolute inset-x-0 bottom-0 transition-all duration-700"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(to top, var(--temp-cool) 0%, var(--temp-neutral) 30%, var(--temp-warm) 55%, var(--temp-hot) 80%, var(--temp-critical) 100%)`,
          }}
        />
        <div
          className="absolute left-0 right-0 h-px bg-foreground/40"
          style={{ bottom: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <div className={`font-serif tabular-nums ${dims.num}`}>
            {v.toFixed(0)}
            <span className="text-base text-muted-foreground">°C</span>
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {band.label}
          </div>
        </div>
      )}
    </div>
  );
}
