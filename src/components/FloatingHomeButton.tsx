import { Link, useRouter } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function FloatingHomeButton() {
  const router = useRouter();
  const { t } = useI18n();
  if (router.state.location.pathname === "/") return null;
  return (
    <Link
      to="/"
      aria-label={t("nav.home")}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90"
    >
      <Home size={20} />
    </Link>
  );
}
