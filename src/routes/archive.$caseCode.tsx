import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { Thermometer } from "@/components/Thermometer";
import { getCaseDetail } from "@/lib/api/archive.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/archive/$caseCode")({
  component: CaseDetail,
});

function CaseDetail() {
  const { language, t, objectType, tag, archiveCategory } = useI18n();
  const { caseCode } = Route.useParams();
  const fetchCase = useServerFn(getCaseDetail);
  const [data, setData] = useState<Awaited<ReturnType<typeof getCaseDetail>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setErr(null);
    fetchCase({ data: { code: caseCode } })
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, [caseCode, fetchCase]);

  if (err)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center">
          <h1 className="font-serif text-3xl">{err}</h1>
          <Link to="/archive" className="mt-4 inline-block text-sm underline">
            {t("common.backToArchive")}
          </Link>
        </div>
      </SiteLayout>
    );
  if (!data)
    return (
      <SiteLayout>
        <div className="container-prose py-32 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteLayout>
    );

  const c = data.case;
  const o = data.object;

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose grid gap-10 py-14 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="font-mono text-foreground">{c.case_code}</span>
              <span>·</span>
              <span>{archiveCategory(c.archive_category)}</span>
              <span>·</span>
              <span>
                {t("common.evidence")} {c.evidence_level}
              </span>
              <span>·</span>
              <span>
                {t("archive.contribution")} {c.impact_score}
              </span>
            </div>
            <h1 className="mt-4 font-serif text-4xl text-balance md:text-5xl">
              {c.summary || t("common.case")}
            </h1>
            <div className="mt-4 text-sm text-muted-foreground">
              {t("common.object")}:
              <Link
                to="/objects/$id"
                params={{ id: o.id }}
                className="ml-1 text-foreground underline"
              >
                {o.name}
              </Link>
              <span className="ml-2">({objectType(o.type)})</span>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <Thermometer value={o.temperature} size="md" />
            <div className="mt-2 text-xs text-muted-foreground">
              {formatDateForLanguage(c.created_at, language)}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose grid gap-12 md:grid-cols-[1fr_18rem]">
          <div>
            {c.tags.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2 text-xs">
                {c.tags.map((t) => (
                  <span key={t} className="border border-border px-2 py-0.5 text-accent">
                    #{tag(t)}
                  </span>
                ))}
              </div>
            )}

            <Section title={t("archive.summary")}>
              <p className="text-base leading-relaxed">{c.summary || t("common.noSummary")}</p>
            </Section>

            {c.facts.length > 0 && (
              <Section title={t("archive.aiFacts")}>
                <ul className="space-y-1 border-l-2 border-accent/40 pl-4 text-sm">
                  {c.facts.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t("archive.cleaned")}>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.cleaned_content || c.content}
              </p>
            </Section>

            <Section title={t("archive.original")}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {c.content}
              </p>
              {c.scene && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("archive.scene")}
                  {c.scene}
                </p>
              )}
              {c.reference_url && (
                <p className="mt-2 text-xs">
                  {t("archive.reference")}
                  <a
                    href={c.reference_url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline"
                  >
                    {c.reference_url}
                  </a>
                </p>
              )}
              {c.screenshot_url && (
                <p className="mt-2 text-xs">
                  {t("archive.screenshot")}
                  <a
                    href={c.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline"
                  >
                    {c.screenshot_url}
                  </a>
                </p>
              )}
            </Section>
          </div>

          <aside className="space-y-8 text-sm">
            <RelatedBlock title={t("archive.sameObject")} items={data.related.same_object} />
            <RelatedBlock title={t("archive.sameTag")} items={data.related.same_tag} />
            <RelatedBlock title={t("archive.sameCategory")} items={data.related.same_category} />
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function RelatedBlock({ title, items }: { title: string; items: any[] }) {
  const { t } = useI18n();
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-3 border-t border-border pt-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              to="/archive/$caseCode"
              params={{ caseCode: r.case_code }}
              className="block hover:text-accent"
            >
              <div className="font-mono text-[11px] text-muted-foreground">{r.case_code}</div>
              <div className="mt-0.5 line-clamp-2 text-sm">
                {r.summary || t("common.noSummary")}
              </div>
              {r.objects?.name && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{r.objects.name}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
