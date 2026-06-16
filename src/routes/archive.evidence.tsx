import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArchiveSectionTabs } from "@/components/ArchiveSectionTabs";
import { ArchiveStamp, DossierPanel, PaperSheet, PaperStack } from "@/components/archive-ui";
import { SiteLayout } from "@/components/SiteLayout";
import { getEvidenceLibrary } from "@/lib/api/archive.functions";
import { formatDateForLanguage, useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/archive/evidence")({
  head: () => ({ meta: [{ title: "女性观察档案 · 观察原文 · 女性友好体验测评" }] }),
  component: ObservationOriginals,
});

function ObservationOriginals() {
  const { language, t, objectType, tag, archiveCategory } = useI18n();
  usePageMeta("seo.evidence.title");
  const fetcher = useServerFn(getEvidenceLibrary);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetcher({ data: { page, page_size: 20 } }).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  }, [fetcher, page]);

  return (
    <SiteLayout>
      <section className="archive-desk border-b border-border">
        <div className="container-prose py-14">
          <PaperStack>
            <DossierPanel
              title={t("archive.title")}
              eyebrow={t("archive.eyebrow")}
              stamp={`SOURCE ${total.toLocaleString()}`}
            >
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("archive.body", { total: total.toLocaleString() })}
              </p>
              <ArchiveSectionTabs active="originals" />
              <PaperSheet tone="slip" className="mt-6 p-5">
                <h2 className="font-serif text-2xl">{t("evidence.title")}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("evidence.body")}</p>
              </PaperSheet>
            </DossierPanel>
          </PaperStack>
        </div>
      </section>

      <section className="archive-desk py-10">
        <div className="container-prose">
          {items.length === 0 ? (
            <PaperSheet tone="slip" className="p-10 text-center text-sm text-muted-foreground">
              {t("evidence.empty")}
            </PaperSheet>
          ) : (
            <ul className="space-y-4">
              {items.map((it) => (
                <li key={it.id}>
                  <Link
                    to="/archive/$caseCode"
                    params={{ caseCode: it.case_code }}
                    className="group block"
                  >
                    <PaperSheet
                      tone="dossier"
                      className="p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-accent/50"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span className="font-mono text-foreground">{it.case_code}</span>
                        <ArchiveStamp className="archive-stamp-soft text-[10px]">
                          {t("common.evidence")} {it.evidence_level ?? "-"}
                        </ArchiveStamp>
                        <span>{archiveCategory(it.archive_category)}</span>
                        <span className="text-foreground">{it.object.name}</span>
                        <span>({objectType(it.object.type)})</span>
                        <span className="ml-auto">
                          {formatDateForLanguage(it.created_at, language)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed group-hover:text-accent">
                        {it.original_text || it.summary || t("common.noSummary")}
                      </p>
                      {it.cleaned_text && it.cleaned_text !== it.original_text && (
                        <p className="mt-3 border-t border-dashed border-border pt-3 text-sm leading-relaxed text-muted-foreground">
                          {it.cleaned_text}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {it.tags.slice(0, 6).map((t: string) => (
                          <span key={t} className="paper-tag">
                            #{tag(t)}
                          </span>
                        ))}
                        {it.reference_url && (
                          <span className="paper-tag ml-auto">{t("common.referenceLink")}</span>
                        )}
                      </div>
                    </PaperSheet>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {total > items.length && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="paper-action-secondary px-3 py-1.5 disabled:opacity-30"
              >
                {t("common.previous")}
              </button>
              <span className="text-muted-foreground">{t("common.pageOnly", { page })}</span>
              <button
                disabled={items.length < 20}
                onClick={() => setPage(page + 1)}
                className="paper-action-secondary px-3 py-1.5 disabled:opacity-30"
              >
                {t("common.next")}
              </button>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
