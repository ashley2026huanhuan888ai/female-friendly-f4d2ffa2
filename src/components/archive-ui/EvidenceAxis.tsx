import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const evidenceRank: Record<string, number> = { D: 0, C: 1, B: 2, A: 3 };

export function EvidenceAxis({
  temperature,
  evidenceLevel,
  className,
}: {
  temperature: number | null | undefined;
  evidenceLevel: string | null | undefined;
  className?: string;
}) {
  const { language } = useI18n();
  const copy = evidenceAxisCopy[language];
  const temp = typeof temperature === "number" ? Math.max(20, Math.min(100, temperature)) : 20;
  const x = ((temp - 20) / 80) * 100;
  const y = 100 - ((evidenceRank[evidenceLevel ?? ""] ?? 1) / 3) * 100;

  return (
    <div className={cn("archive-paper p-5", className)}>
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {copy.title}
        </div>
        <div className="font-mono text-xs archive-highlight">
          {temperature == null ? "—" : `${temp.toFixed(0)}°C`} · {evidenceLevel ?? "—"}
        </div>
      </div>
      <div className="relative mt-5 h-40 border-b border-l border-foreground/60">
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border border-foreground bg-[var(--archive-pink)]"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
        <div className="absolute -bottom-6 left-0 text-[10px] text-muted-foreground">
          {copy.cool}
        </div>
        <div className="absolute -bottom-6 right-0 text-[10px] archive-highlight">
          {copy.critical}
        </div>
        <div className="absolute -left-5 top-0 text-[10px] text-muted-foreground">A</div>
        <div className="absolute -left-5 bottom-0 text-[10px] text-muted-foreground">D</div>
      </div>
    </div>
  );
}

const evidenceAxisCopy = {
  zh: { title: "温度 × 证据", cool: "低温", critical: "烫伤级避雷" },
  en: { title: "Temperature × Evidence", cool: "Low", critical: "Avoid" },
} as const;
