import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PaperTone = "flat" | "lifted" | "offset" | "dossier" | "slip";

const toneClass: Record<PaperTone, string> = {
  flat: "archive-paper",
  lifted: "archive-paper archive-paper-lifted",
  offset: "archive-paper archive-paper-offset",
  dossier: "archive-paper archive-paper-dossier",
  slip: "archive-paper archive-paper-slip",
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
