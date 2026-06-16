import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { getEvidenceLibrary } from "@/lib/api/archive.functions";
import { formatDateForLanguage, useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/archive/evidence")({
  head: () => ({ meta: [{ title: "女性观察原文 · 女性友好体验测评" }] }),
  component: EvidenceLib,
});

function EvidenceLib() {
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
      <section className="border-b border-border">
        <div className="container-prose py-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("evidence.eyebrow")}
          </div>
          <h1 className="mt-3 font-serif text-4xl">{t("evidence.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {t("evidence.body", { total: total.toLocaleString() })}
          </p>
          <Link
            to="/archive"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("evidence.back")}
          </Link>
        </div>
      </section>

      <section className="py-10">
        <div className="container-prose">
          {items.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">{t("evidence.empty")}</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {items.map((it) => (
                <li key={it.id} className="py-5">
                  <Link
                    to="/archive/$caseCode"
                    params={{ caseCode: it.case_code }}
                    className="group block"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span className="font-mono text-foreground">{it.case_code}</span>
                      <span>·</span>
                      <span className="border border-accent px-1.5 text-accent">
                        {t("common.evidence")} A
                      </span>
                      <span>·</span>
                      <span>{archiveCategory(it.archive_category)}</span>
                      <span>·</span>
                      <span className="text-foreground">{it.object.name}</span>
                      <span>({objectType(it.object.type)})</span>
                      <span className="ml-auto">
                        {formatDateForLanguage(it.created_at, language)}
                      </span>
                    </div>
                    <p className="mt-2 text-base leading-relaxed group-hover:text-accent">
                      {it.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {it.tags.slice(0, 6).map((t: string) => (
                        <span key={t} className="text-accent">
                          #{tag(t)}
                        </span>
                      ))}
                      {it.reference_url && (
                        <span className="ml-auto">📎 {t("common.referenceLink")}</span>
                      )}
                      {it.screenshot_url && <span>🖼 {t("common.screenshot")}</span>}
                    </div>
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
                className="border border-border px-3 py-1.5 disabled:opacity-30"
              >
                {t("common.previous")}
              </button>
              <span className="text-muted-foreground">{t("common.pageOnly", { page })}</span>
              <button
                disabled={items.length < 20}
                onClick={() => setPage(page + 1)}
                className="border border-border px-3 py-1.5 disabled:opacity-30"
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
