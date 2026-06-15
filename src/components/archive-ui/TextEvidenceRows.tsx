import { cn } from "@/lib/utils";

export type TextEvidenceRow = {
  label: string;
  value: string;
  accent?: boolean;
};

export function TextEvidenceRows({
  rows,
  className,
}: {
  rows: TextEvidenceRow[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-border border-y border-border text-sm", className)}>
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2 py-3 md:grid-cols-[120px_1fr]">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {row.label}
          </dt>
          <dd className={cn("leading-relaxed", row.accent && "archive-highlight")}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
