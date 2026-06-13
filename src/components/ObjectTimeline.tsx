import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getObjectTimeline } from "@/lib/api/archive.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

type Point = Awaited<ReturnType<typeof getObjectTimeline>>[number];

export function ObjectTimeline({ objectId }: { objectId: string }) {
  const { language, t, tag } = useI18n();
  const fetcher = useServerFn(getObjectTimeline);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher({ data: { object_id: objectId } })
      .then(setPoints)
      .finally(() => setLoading(false));
  }, [fetcher, objectId]);

  if (loading) return <p className="text-sm text-muted-foreground">{t("timeline.loading")}</p>;
  if (points.length === 0)
    return <p className="text-sm text-muted-foreground">{t("timeline.empty")}</p>;

  // 累积平均贡献分作为温度趋势近似
  const trend: { x: number; y: number; t: string }[] = [];
  let sum = 0;
  points.forEach((p, i) => {
    sum += p.impact_score;
    trend.push({ x: i, y: 20 + sum / (i + 1), t: p.created_at });
  });
  const n = trend.length;
  const min = Math.min(20, ...trend.map((p) => p.y));
  const max = Math.max(40, ...trend.map((p) => p.y));
  const xPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const yPct = (v: number) => 100 - ((v - min) / (max - min || 1)) * 100;
  const path = trend.map((p, i) => `${i === 0 ? "M" : "L"} ${xPct(i)} ${yPct(p.y)}`).join(" ");

  return (
    <div>
      <div className="relative h-32 border-b border-l border-border bg-card/30 px-2">
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
          {trend.map((p, i) => (
            <circle
              key={i}
              cx={xPct(i)}
              cy={yPct(p.y)}
              r="0.9"
              fill="var(--accent)"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDateForLanguage(points[0].created_at, language)}</span>
        <span>{t("timeline.estimatedTrend")}</span>
        <span>{formatDateForLanguage(points[n - 1].created_at, language)}</span>
      </div>

      <ol className="mt-8 space-y-4 border-l border-border pl-5">
        {points.map((p) => {
          const caseCode = p.case_code;
          return (
            <li key={p.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-accent" />
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="font-mono text-foreground">
                  {caseCode || t("timeline.unarchived")}
                </span>
                <span>·</span>
                <span className="border border-border px-1.5">
                  {t("common.evidence")} {p.evidence_level}
                </span>
                <span>·</span>
                <span>
                  {t("archive.contribution")} {p.impact_score}
                </span>
                <span className="ml-auto">{formatDateForLanguage(p.created_at, language)}</span>
              </div>
              {caseCode ? (
                <Link
                  to="/archive/$caseCode"
                  params={{ caseCode }}
                  className="mt-1 block text-sm hover:text-accent"
                >
                  {p.summary || t("common.noSummary")}
                </Link>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">
                  {p.summary || t("common.noSummary")}
                </div>
              )}
              {p.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-accent">
                  {p.tags.slice(0, 5).map((t) => (
                    <span key={t}>#{tag(t)}</span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
