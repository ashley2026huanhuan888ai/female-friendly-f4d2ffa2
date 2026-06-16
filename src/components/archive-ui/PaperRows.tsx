import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PaperRow = {
  label: ReactNode;
  value: ReactNode;
  accent?: boolean;
};

export function PaperRows({ rows, className }: { rows: PaperRow[]; className?: string }) {
  return (
    <dl className={cn("text-sm", className)}>
      {rows.map((row, index) => (
        <div key={index} className="paper-row grid gap-2 py-2.5 sm:grid-cols-[7.5rem_1fr]">
          <dt className="font-medium">{row.label}</dt>
          <dd className={cn("min-w-0 text-muted-foreground", row.accent && "archive-highlight")}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
