import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ArchiveStamp({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "archive-stamp inline-flex items-center justify-center px-2.5 py-1 font-mono text-[10px] font-semibold leading-none",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
