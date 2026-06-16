import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArchiveStamp } from "./ArchiveStamp";
import { PaperSheet } from "./PaperSheet";

export function DossierPanel({
  children,
  className,
  eyebrow,
  title,
  stamp,
  meta,
  tone = "dossier",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  stamp?: ReactNode;
  meta?: ReactNode;
  tone?: "flat" | "lifted" | "offset" | "dossier" | "slip";
}) {
  return (
    <PaperSheet tone={tone} className={cn("p-5 md:p-6", className)} {...props}>
      {(eyebrow || title || stamp || meta) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-foreground/70 pb-4">
          <div className="min-w-0">
            {eyebrow && (
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </div>
            )}
            {title && <div className="mt-1 font-serif text-2xl leading-tight">{title}</div>}
            {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
          </div>
          {stamp && (
            <ArchiveStamp className="archive-stamp-soft rotate-[-4deg]">{stamp}</ArchiveStamp>
          )}
        </div>
      )}
      {children}
    </PaperSheet>
  );
}
