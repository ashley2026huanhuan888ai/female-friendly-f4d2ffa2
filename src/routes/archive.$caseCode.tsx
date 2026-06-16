import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArchiveStamp,
  DossierPanel,
  PaperRows,
  PaperSheet,
  PaperStack,
  TemperatureVerdict,
} from "@/components/archive-ui";
import { SiteLayout } from "@/components/SiteLayout";
import { getCaseDetail } from "@/lib/api/archive.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/archive/$caseCode")({
  loader: async ({ params }) => {
    return getCaseDetail({ data: { code: params.caseCode } });
  },
  head: ({ loaderData, params }) => {
    const c = (loaderData as any)?.case;
    const o = (loaderData as any)?.object;
    const title = c?.summary ? `${c.summary} · 案例详情` : "案例详情 · 女性友好体验测评";
    const description = c?.summary
      ? `${c.summary} — 关于 ${o?.name || "该对象"} 的女性友好观察。`
      : "查看女性友好体验测评案例详情。";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/archive/${params.caseCode}` }],
    };
  },
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="archive-desk py-24">
        <div className="container-prose">
          <PaperSheet tone="dossier" className="p-10 text-center">
            <h1 className="font-serif text-3xl">{(error as Error).message}</h1>
            <Link to="/archive" className="paper-action-secondary mt-6 inline-flex text-sm">
              返回女性观察档案
            </Link>
          </PaperSheet>
        </div>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="archive-desk py-24">
        <div className="container-prose">
          <PaperSheet tone="dossier" className="p-10 text-center">
            <h1 className="font-serif text-3xl">案例未找到</h1>
            <Link to="/archive" className="paper-action-secondary mt-6 inline-flex text-sm">
              返回女性观察档案
            </Link>
          </PaperSheet>
        </div>
      </section>
    </SiteLayout>
  ),
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
        <section className="archive-desk py-24">
          <div className="container-prose">
            <PaperSheet tone="dossier" className="p-10 text-center">
              <h1 className="font-serif text-3xl">{err}</h1>
              <Link to="/archive" className="paper-action-secondary mt-6 inline-flex text-sm">
                {t("common.backToArchive")}
              </Link>
            </PaperSheet>
          </div>
        </section>
      </SiteLayout>
    );
  if (!data)
    return (
      <SiteLayout>
        <section className="archive-desk py-24">
          <div className="container-prose">
            <PaperSheet tone="slip" className="p-10 text-center text-muted-foreground">
              {t("common.loading")}
            </PaperSheet>
          </div>
        </section>
      </SiteLayout>
    );

  const c = data.case;
  const o = data.object;

  return (
    <SiteLayout>
      <section className="archive-desk border-b border-border">
        <div className="container-prose grid gap-8 py-14 md:grid-cols-[minmax(0,1fr)_20rem]">
          <PaperStack>
            <DossierPanel
              title={c.summary || t("common.case")}
              eyebrow={`${archiveCategory(c.archive_category)} / ${c.case_code}`}
              stamp={c.case_code}
            >
              <PaperRows
                rows={[
                  {
                    label: t("common.object"),
                    value: (
                      <Link
                        to="/objects/$id"
                        params={{ id: o.id }}
                        className="text-foreground underline"
                      >
                        {o.name}
                      </Link>
                    ),
                  },
                  { label: t("archive.category"), value: archiveCategory(c.archive_category) },
                  { label: t("archive.objectType"), value: objectType(o.type) },
                  { label: t("common.evidence"), value: c.evidence_level },
                  { label: t("archive.contribution"), value: c.impact_score },
                  {
                    label: t("common.createdAt"),
                    value: formatDateForLanguage(c.created_at, language),
                  },
                ]}
              />
              {c.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 text-xs">
                  {c.tags.map((t) => (
                    <span key={t} className="paper-tag paper-tag-active">
                      #{tag(t)}
                    </span>
                  ))}
                </div>
              )}
            </DossierPanel>
          </PaperStack>

          <PaperSheet tone="slip" className="self-start p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("submit.currentTemperature")}
              </div>
              <ArchiveStamp className="archive-stamp-soft rotate-[-5deg]">
                {t("common.evidence")} {c.evidence_level}
              </ArchiveStamp>
            </div>
            <TemperatureVerdict value={o.temperature} compact className="mt-5" />
          </PaperSheet>
        </div>
      </section>

      <section className="archive-desk py-12">
        <div className="container-prose grid gap-12 md:grid-cols-[1fr_18rem]">
          <div className="space-y-5">
            <Section title={t("archive.summary")}>
              <p className="text-base leading-relaxed">{c.summary || t("common.noSummary")}</p>
            </Section>

            {c.facts.length > 0 && (
              <Section title={t("archive.aiFacts")}>
                <ul className="space-y-1 border-l-2 border-accent/40 pl-4 text-sm leading-relaxed">
                  {c.facts.map((f, i) => (
                    <li key={i}>{f}</li>
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
    <PaperSheet tone="dossier" className="p-5">
      <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {children}
    </PaperSheet>
  );
}

function RelatedBlock({ title, items }: { title: string; items: any[] }) {
  const { t } = useI18n();
  if (!items?.length) return null;
  return (
    <PaperSheet tone="slip" className="p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-3 border-t border-dashed border-border pt-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              to="/archive/$caseCode"
              params={{ caseCode: r.case_code }}
              className="block hover:text-accent"
            >
              <ArchiveStamp className="archive-stamp-soft text-[10px]">{r.case_code}</ArchiveStamp>
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
    </PaperSheet>
  );
}
