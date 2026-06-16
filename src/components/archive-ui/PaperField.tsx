import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PaperField({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("paper-field grid gap-2 text-sm sm:grid-cols-[8rem_1fr]", className)}>
      <div className="font-medium text-foreground">{label}</div>
      <div className="min-w-0 text-muted-foreground">{children}</div>
    </div>
  );
}
