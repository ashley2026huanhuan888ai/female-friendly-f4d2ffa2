import { Link } from "@tanstack/react-router";
import { FollowButton } from "./FollowButton";
import { ArchiveStamp, PaperSheet } from "@/components/archive-ui";
import { formatRelativeDate, useI18n } from "@/lib/i18n";
import { bandOf } from "@/lib/temperature";

interface Props {
  id: string;
  name: string;
  type: string;
  temperature: number;
  observation_count: number;
  ai_summary?: string | null;
  top_tags?: { tag: string; count: number }[] | null;
  heat_sources?: { label?: string; title?: string }[] | null;
  cooling_sources?: { label?: string; title?: string }[] | null;
  updated_at?: string | null;
  showActions?: boolean;
}

export function ObjectCard({
  id,
  name,
  type,
  temperature,
  observation_count,
  ai_summary,
  top_tags,
  heat_sources,
  cooling_sources,
  updated_at,
  showActions = false,
}: Props) {
  const { language, t, objectType, tag, band: bandLabel } = useI18n();
  const tags = (top_tags ?? []).slice(0, 3);
  const heatTop = heat_sources?.[0];
  const coolTop = cooling_sources?.[0];
  const updated = formatRelativeDate(updated_at, language);
  const heatLabel = heatTop?.label ?? heatTop?.title;
  const coolLabel = coolTop?.label ?? coolTop?.title;
  const measured = observation_count > 0;
  const band = measured ? bandOf(temperature) : null;

  return (
    <article className="group focus-within:outline-none">
      <PaperSheet tone="slip" className="h-full transition-all group-hover:border-foreground/50">
        <Link
          to="/objects/$id"
          params={{ id }}
          aria-label={`${t("objects.viewDetail")}: ${name}`}
          className="grid gap-5 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:grid-cols-[1fr_9.5rem]"
        >
          <div className="pointer-events-none min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <span>{objectType(type)}</span>
              <span>·</span>
              <span className="font-mono">
                {updated ? `${t("common.updatedAt")} ${updated}` : t("objects.viewDetail")}
              </span>
            </div>
            <h3 className="mt-2 font-serif text-2xl leading-tight text-balance group-hover:text-[var(--archive-pink)]">
              {name}
            </h3>
            {ai_summary && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {ai_summary}
              </p>
            )}

            {(heatLabel || coolLabel) && (
              <div className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
                {heatLabel && (
                  <div>
                    <span className="archive-highlight">+</span> {t("objects.mainHeat")}
                    {heatLabel}
                  </div>
                )}
                {coolLabel && (
                  <div>
                    <span className="text-muted-foreground">-</span> {t("objects.mainCooling")}
                    {coolLabel}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{t("common.observationCount", { count: observation_count })}</span>
            </div>
          </div>
          <div className="pointer-events-none border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <ArchiveStamp className="archive-stamp-soft rotate-[-2deg]">
              {measured && band ? bandLabel(band.band, band.label) : t("common.unmeasured")}
            </ArchiveStamp>
            <div className="mt-4 font-serif text-4xl tabular-nums archive-highlight">
              {measured ? temperature.toFixed(0) : "—"}
              {measured && <span className="ml-1 text-base text-muted-foreground">°C</span>}
            </div>
            <div className="mt-3 h-2 border border-border bg-muted">
              <div
                className="h-full bg-[var(--archive-pink)]"
                style={{
                  width: `${measured ? ((Math.max(20, Math.min(100, temperature)) - 20) / 80) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </Link>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-4">
            {tags.map((tagItem) => {
              const label = tag(tagItem.tag);
              return (
                <Link
                  key={tagItem.tag}
                  to="/objects"
                  search={{ tag: tagItem.tag }}
                  aria-label={t("objects.viewTagObjects", { tag: label })}
                  className="paper-tag px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  #{label}
                </Link>
              );
            })}
          </div>
        )}

        {showActions && (
          <div className="paper-divider flex flex-wrap items-center gap-2 px-5 py-4">
            <Link
              to="/objects/$id"
              params={{ id }}
              className="paper-action-secondary px-3 py-1.5 text-xs uppercase tracking-wider"
            >
              {t("objects.viewDetail")}
            </Link>
            <Link
              to="/submit/$objectId"
              params={{ objectId: id }}
              className="paper-action px-3 py-1.5 text-xs uppercase tracking-wider"
            >
              {t("objects.submitObservation")}
            </Link>
            <FollowButton objectId={id} />
          </div>
        )}
      </PaperSheet>
    </article>
  );
}
