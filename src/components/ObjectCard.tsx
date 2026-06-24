import { Link } from "@tanstack/react-router";
import { Thermometer } from "./Thermometer";
import { FollowButton } from "./FollowButton";
import { formatRelativeDate, useI18n } from "@/lib/i18n";

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
  const { language, t, objectType, tag } = useI18n();
  const tags = (top_tags ?? []).slice(0, 3);
  const heatTop = heat_sources?.[0];
  const coolTop = cooling_sources?.[0];
  const updated = formatRelativeDate(updated_at, language);
  const heatLabel = heatTop?.label ?? heatTop?.title;
  const coolLabel = coolTop?.label ?? coolTop?.title;

  return (
    <article className="group border border-border bg-card transition-all hover:border-foreground/40 hover:shadow-sm focus-within:border-foreground/60">
      <Link
        to="/objects/$id"
        params={{ id }}
        aria-label={`${t("objects.viewDetail")}: ${name}`}
        className="flex items-start justify-between gap-6 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="pointer-events-none min-w-0 flex-1">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">
                {t("common.observationCount", { count: observation_count })}
              </span>
              <span aria-hidden>·</span>
              <span>{objectType(type)}</span>
            </div>
            <h3 className="mt-2 font-serif text-2xl leading-tight text-balance group-hover:text-accent">
              {name}
            </h3>
            {ai_summary && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{ai_summary}</p>
            )}

            {(heatLabel || coolLabel) && (
              <div className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
                {heatLabel && (
                  <div>
                    <span className="text-[var(--temp-hot,#c1440e)]">▲</span>{" "}
                    {t("objects.mainHeat")}
                    {heatLabel}
                  </div>
                )}
                {coolLabel && (
                  <div>
                    <span className="text-[var(--temp-cool,#2563eb)]">▼</span>{" "}
                    {t("objects.mainCooling")}
                    {coolLabel}
                  </div>
                )}
              </div>
            )}

            {updated && (
              <div className="mt-4 text-xs text-muted-foreground">
                {t("common.updatedAt")} {updated}
              </div>
            )}
          </div>
        </div>

        <Thermometer value={temperature} size="lg" showLabel={false} unmeasured={observation_count === 0} />
      </Link>

      {tags.length > 0 && (
        <div className="-mt-3 flex flex-wrap gap-1.5 px-6 pb-4">
          {tags.map((tagItem) => {
            const label = tag(tagItem.tag);
            return (
              <Link
                key={tagItem.tag}
                to="/objects"
                search={{ tag: tagItem.tag }}
                aria-label={t("objects.viewTagObjects", { tag: label })}
                className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                #{label}
              </Link>
            );
          })}
        </div>
      )}

      {showActions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4">
          <Link
            to="/objects/$id"
            params={{ id }}
            className="border border-foreground/60 px-3 py-1.5 text-xs uppercase tracking-wider text-foreground hover:border-foreground"
          >
            {t("objects.viewDetail")}
          </Link>
          <Link
            to="/submit/$objectId"
            params={{ objectId: id }}
            className="border border-foreground bg-foreground px-3 py-1.5 text-xs uppercase tracking-wider text-background hover:bg-accent hover:border-accent"
          >
            {t("objects.submitObservation")}
          </Link>
          <FollowButton objectId={id} />
        </div>
      )}
    </article>
  );
}
