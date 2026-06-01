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
}

const ROWS: Array<{ key: keyof Breakdown; label: string; sign: 1 | -1; hint: string }> = [
  { key: "knowledge", label: "标签影响", sign: 1, hint: "负面标签 × 证据 × 置信度" },
  { key: "evidence", label: "证据强度", sign: 1, hint: "A/B 级证据加成" },
  { key: "case", label: "案例引用", sign: 1, hint: "引用已发布知识案例数" },
  { key: "trend", label: "近期趋势", sign: 1, hint: "近 14 天 vs 历史均值" },
  { key: "positive", label: "正向行为", sign: -1, hint: "正向标签降温" },
  { key: "cooling", label: "自然冷却", sign: 1, hint: "30 天周期" },
];

export function TemperatureBreakdown({ data }: { data: Breakdown | null }) {
  if (!data) {
    return (
      <div className="border border-dashed border-border p-6 text-sm text-muted-foreground">
        尚未生成温度分解。新增观察通过审核后将自动生成。
      </div>
    );
  }
  const max = Math.max(
    1,
    ...ROWS.map((r) => Math.abs(Number(data[r.key]) || 0)),
  );
  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            为什么是这个温度？
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            基准 {data.base}° · 多样性 ×{data.diversity} · 参与观察 {data.active_count}/{data.total_count}
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
                <div>{r.label}</div>
                <div className="text-[10px] text-muted-foreground">{r.hint}</div>
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
              <div className={`text-right font-mono text-xs tabular-nums ${pos ? "text-foreground" : "text-muted-foreground"}`}>
                {signed > 0 ? "+" : ""}{signed.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        所有数值均来自已审核观察 + 知识库标签权重 + AI 引用的原则与案例。每次温度变化均写入审计事件，可追溯、可复核。
      </p>
    </div>
  );
}
