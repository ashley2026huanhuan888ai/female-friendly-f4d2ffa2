import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PaperStack({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div className={cn("archive-paper-stack", className)} {...props}>
      {children}
    </div>
  );
}
