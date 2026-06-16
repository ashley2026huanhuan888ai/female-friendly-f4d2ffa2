import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

type ArchiveSection = "originals" | "cases";

const SECTIONS = [
  {
    id: "originals",
    to: "/archive/evidence",
    labelKey: "archive.tabs.originals",
    bodyKey: "archive.tabs.originalsBody",
  },
  {
    id: "cases",
    to: "/archive",
    labelKey: "archive.tabs.cases",
    bodyKey: "archive.tabs.casesBody",
  },
] as const;

export function ArchiveSectionTabs({ active }: { active: ArchiveSection }) {
  const { t } = useI18n();

  return (
    <nav className="mt-8 grid gap-3 md:grid-cols-2" aria-label={t("archive.tabs.label")}>
      {SECTIONS.map((section) => {
        const selected = section.id === active;
        return (
          <Link
            key={section.id}
            to={section.to}
            aria-current={selected ? "page" : undefined}
            className={`border px-4 py-3 text-left transition ${
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card/50 text-foreground hover:border-foreground"
            }`}
          >
            <span className="block font-serif text-lg">{t(section.labelKey)}</span>
            <span
              className={`mt-1 block text-xs leading-relaxed ${
                selected ? "text-background/75" : "text-muted-foreground"
              }`}
            >
              {t(section.bodyKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
