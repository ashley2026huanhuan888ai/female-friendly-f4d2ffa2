import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RiskTicket({
  temperature,
  evidenceLevel,
  triggerCount,
  recommendation,
  className,
}: {
  temperature: number | null | undefined;
  evidenceLevel: string | null | undefined;
  triggerCount: number;
  recommendation: string;
  className?: string;
}) {
  const { evidence, language } = useI18n();
  const copy = riskTicketCopy[language];

  return (
    <div className={cn("archive-paper archive-paper-lifted p-5", className)}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {copy.title}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Metric
          label={copy.temperature}
          value={temperature == null ? "—" : `${temperature.toFixed(0)}°C`}
        />
        <Metric label={copy.evidence} value={evidence(evidenceLevel)} />
        <Metric label={copy.triggers} value={copy.triggerCount(triggerCount)} />
        <Metric label={copy.recommendation} value={recommendation} accent />
      </div>
    </div>
  );
}

const riskTicketCopy = {
  zh: {
    title: "AI 初筛票据",
    temperature: "当前温度",
    evidence: "证据等级",
    triggers: "触发点",
    recommendation: "建议",
    triggerCount: (count: number) => `${count}项`,
  },
  en: {
    title: "AI Screening Ticket",
    temperature: "Current temperature",
    evidence: "Evidence level",
    triggers: "Triggers",
    recommendation: "Recommendation",
    triggerCount: (count: number) => `${count} items`,
  },
} as const;

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-t border-border pt-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-serif text-2xl", accent && "archive-highlight")}>{value}</div>
    </div>
  );
}
