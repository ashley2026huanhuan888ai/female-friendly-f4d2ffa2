import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PaperTone = "flat" | "lifted" | "offset";

const toneClass: Record<PaperTone, string> = {
  flat: "archive-paper",
  lifted: "archive-paper archive-paper-lifted",
  offset: "archive-paper archive-paper-offset",
};

export function PaperSheet({
  children,
  className,
  tone = "flat",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: PaperTone;
}) {
  return (
    <div className={cn(toneClass[tone], className)} {...props}>
      {children}
    </div>
  );
}
