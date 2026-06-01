interface Source { tag: string; delta: number; count: number }

export function HeatSources({
  heat = [], cooling = [],
}: { heat?: Source[]; cooling?: Source[] }) {
  if (!heat.length && !cooling.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">主要升温来源</div>
        {heat.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">无</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {heat.map((s) => (
              <li key={s.tag} className="flex items-center justify-between border-b border-border pb-1.5 text-sm">
                <span>{s.tag} <span className="text-[10px] text-muted-foreground">×{s.count}</span></span>
                <span className="font-mono text-xs tabular-nums" style={{ color: "var(--temp-hot)" }}>+{s.delta.toFixed(1)}°</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">主要降温来源</div>
        {cooling.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">尚未出现正向案例</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {cooling.map((s) => (
              <li key={s.tag} className="flex items-center justify-between border-b border-border pb-1.5 text-sm">
                <span>{s.tag} <span className="text-[10px] text-muted-foreground">×{s.count}</span></span>
                <span className="font-mono text-xs tabular-nums" style={{ color: "var(--temp-cool)" }}>{s.delta.toFixed(1)}°</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
