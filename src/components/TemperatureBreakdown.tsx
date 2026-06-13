import { useI18n } from "@/lib/i18n";

interface Breakdown {
  base: number;
  knowledge: number;
  positive: number;
  evidence: number;
  case: number;
  trend: number;
  cooling: number;
  diversity: number;
  active_count: number;
  total_count: number;
  ai_temperature?: number;
  rule_minimum_temperature?: number;
  triggered_rules?: string[];
  has_regulatory_penalty?: boolean;
}

const ROWS: Array<{
  key: keyof Breakdown;
  labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  hintKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  sign: 1 | -1;
}> = [
  {
    key: "knowledge",
    labelKey: "temperatureBreakdown.knowledge",
    hintKey: "temperatureBreakdown.knowledgeHint",
    sign: 1,
  },
  {
    key: "evidence",
    labelKey: "temperatureBreakdown.evidence",
    hintKey: "temperatureBreakdown.evidenceHint",
    sign: 1,
  },
  {
    key: "case",
    labelKey: "temperatureBreakdown.case",
    hintKey: "temperatureBreakdown.caseHint",
    sign: 1,
  },
  {
    key: "trend",
    labelKey: "temperatureBreakdown.trend",
    hintKey: "temperatureBreakdown.trendHint",
    sign: 1,
  },
  {
    key: "positive",
    labelKey: "temperatureBreakdown.positive",
    hintKey: "temperatureBreakdown.positiveHint",
    sign: -1,
  },
  {
    key: "cooling",
    labelKey: "temperatureBreakdown.cooling",
    hintKey: "temperatureBreakdown.coolingHint",
    sign: 1,
  },
];

export function TemperatureBreakdown({ data }: { data: Breakdown | null }) {
  const { t } = useI18n();
  if (!data) {
    return (
      <div className="border border-dashed border-border p-6 text-sm text-muted-foreground">
        {t("temperatureBreakdown.empty")}
      </div>
    );
  }
  const max = Math.max(1, ...ROWS.map((r) => Math.abs(Number(data[r.key]) || 0)));
  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("temperatureBreakdown.title")}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {t("temperatureBreakdown.meta", {
              base: data.base,
              diversity: data.diversity,
              active: data.active_count,
              total: data.total_count,
            })}
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {ROWS.map((r) => {
          const raw = Number(data[r.key]) || 0;
          const signed = r.sign === -1 ? -Math.abs(raw) : raw;
          const w = Math.min(100, (Math.abs(raw) / max) * 100);
          const pos = signed >= 0;
          return (
            <div key={r.key} className="grid grid-cols-[100px_1fr_60px] items-center gap-3 text-sm">
              <div>
                <div>{t(r.labelKey)}</div>
                <div className="text-[10px] text-muted-foreground">{t(r.hintKey)}</div>
              </div>
              <div className="h-2 bg-muted">
                <div
                  className="h-full"
                  style={{
                    width: `${w}%`,
                    background: pos ? "var(--temp-hot)" : "var(--temp-cool)",
                  }}
                />
              </div>
              <div
                className={`text-right font-mono text-xs tabular-nums ${pos ? "text-foreground" : "text-muted-foreground"}`}
              >
                {signed > 0 ? "+" : ""}
                {signed.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
      {(data.rule_minimum_temperature ?? 0) > 20 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("temperatureBreakdown.ruleMinimum")}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 font-mono text-xs">
            <div>
              <div className="text-muted-foreground">{t("temperatureBreakdown.aiTemperature")}</div>
              <div className="text-base">{(data.ai_temperature ?? 0).toFixed(1)}°</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("temperatureBreakdown.ruleFloor")}</div>
              <div className="text-base" style={{ color: "var(--temp-hot)" }}>
                {(data.rule_minimum_temperature ?? 0).toFixed(1)}°
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">
                {t("temperatureBreakdown.finalTemperature")}
              </div>
              <div className="text-base font-bold">
                {Math.max(data.ai_temperature ?? 0, data.rule_minimum_temperature ?? 0).toFixed(1)}°
              </div>
            </div>
          </div>
          {(data.triggered_rules?.length ?? 0) > 0 && (
            <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              {data.triggered_rules!.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          )}
          {data.has_regulatory_penalty && (
            <div className="mt-2 inline-block bg-foreground px-2 py-0.5 text-[10px] text-background">
              {t("temperatureBreakdown.regulatory")}
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {t("temperatureBreakdown.footer")}
      </p>
    </div>
  );
}
