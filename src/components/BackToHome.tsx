import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BackToHome({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground ${className}`}
    >
      <Home className="h-4 w-4" />
      {t("common.home")}
    </Link>
  );
}
