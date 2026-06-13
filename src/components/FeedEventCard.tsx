import { Link } from "@tanstack/react-router";
import { bandOf } from "@/lib/temperature";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

interface Event {
  id: string;
  object_id: string;
  delta: number;
  temperature_after: number;
  before: number;
  reason: string;
  created_at: string;
  object: { id: string; name: string; type: string; temperature: number } | null;
}

export function FeedEventCard({ ev }: { ev: Event }) {
  const { language, t, objectType, band: bandLabel } = useI18n();
  if (!ev.object) return null;
  const heating = ev.delta > 0;
  const band = bandOf(ev.temperature_after);
  const reasonKey = `feed.reason.${ev.reason}` as Parameters<typeof t>[0];
  const reasonText = t(reasonKey) === reasonKey ? ev.reason : t(reasonKey);
  const date = formatDateForLanguage(ev.created_at, language, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      to="/objects/$id"
      params={{ id: ev.object.id }}
      aria-label={`${t("objects.viewDetail")}: ${ev.object.name}`}
      className="block cursor-pointer border border-border bg-card p-5 transition-all hover:border-foreground/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{objectType(ev.object.type)}</span>
            <span>·</span>
            <span>{date}</span>
          </div>
          <h3 className="mt-1.5 font-serif text-xl leading-tight">{ev.object.name}</h3>
          <div className="mt-2 flex items-baseline gap-2 font-mono text-sm tabular-nums">
            <span className="text-muted-foreground">{ev.before.toFixed(0)}°C</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground">{Number(ev.temperature_after).toFixed(0)}°C</span>
            <span
              className={`ml-1 px-1.5 py-0.5 text-xs ${
                heating
                  ? "bg-[color-mix(in_oklab,var(--temp-hot)_18%,transparent)] text-foreground"
                  : "bg-[color-mix(in_oklab,var(--temp-cool)_18%,transparent)] text-foreground"
              }`}
            >
              {heating ? "+" : ""}
              {ev.delta}°C
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("feed.reason")}
            <span className="text-foreground">{reasonText}</span>
          </p>
        </div>
        <span
          className="mt-1 inline-block h-2.5 w-10 rounded-full"
          style={{ background: band.color }}
          title={bandLabel(band.band, band.label)}
        />
      </div>
    </Link>
  );
}
