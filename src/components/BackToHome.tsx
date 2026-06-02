import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function BackToHome({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground ${className}`}
    >
      <Home className="h-4 w-4" />
      返回首页
    </Link>
  );
}
