import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArchiveSectionTabs } from "@/components/ArchiveSectionTabs";
import { ArchiveStamp, DossierPanel, PaperSheet, PaperStack } from "@/components/archive-ui";
import { SiteLayout } from "@/components/SiteLayout";
import { searchArchive, ARCHIVE_CATEGORIES } from "@/lib/api/archive.functions";
import { FEMINIST_TAGS, bandOf } from "@/lib/temperature";
import { formatDateForLanguage, useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/archive/")({
  head: () => ({
    meta: [
      { title: "女性观察档案 · 女性友好体验测评" },
      {
        name: "description",
        content: "女性观察原文与平台整理案例的分层档案。",
      },
    ],
  }),
  component: ArchivePage,
});

type Item = Awaited<ReturnType<typeof searchArchive>>["items"][number];

function ArchivePage() {
  const { t, objectType, tag, archiveCategory } = useI18n();
  usePageMeta("seo.archive.title", "seo.archive.description");
  const search = useServerFn(searchArchive);
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [tempRange, setTempRange] = useState<[number, number]>([20, 100]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  useEffect(() => {
    setLoading(true);
    search({
      data: {
        q: q || undefined,
        categories: categories.length ? categories : undefined,
        tags: tags.length ? tags : undefined,
        object_types: types.length ? types : undefined,
        evidence: (evidence.length ? evidence : undefined) as any,
        temp_min: tempRange[0],
        temp_max: tempRange[1],
        page,
        page_size: 20,
      },
    })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [search, q, categories, tags, types, evidence, tempRange, page]);

  useEffect(() => {
    setPage(1);
  }, [q, categories, tags, types, evidence, tempRange]);

  return (
    <SiteLayout>
      <section className="archive-desk border-b border-border">
        <div className="container-prose py-14">
          <PaperStack>
            <DossierPanel
              title={t("archive.title")}
              eyebrow={t("archive.eyebrow")}
              stamp={`TOTAL ${total.toLocaleString()}`}
            >
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("archive.body", { total: total.toLocaleString() })}
              </p>
              <ArchiveSectionTabs active="cases" />
              <div className="mt-6 flex gap-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("archive.searchPlaceholder")}
                  className="paper-input flex-1"
                />
              </div>
            </DossierPanel>
          </PaperStack>
        </div>
      </section>

      <section className="archive-desk border-b border-border">
        <div className="container-prose space-y-4 py-6 text-xs">
          <PaperSheet tone="slip" className="space-y-4 p-5">
            <Row label={t("archive.category")}>
              {ARCHIVE_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  active={categories.includes(c)}
                  onClick={() => toggle(categories, c, setCategories)}
                >
                  {archiveCategory(c)}
                </Chip>
              ))}
            </Row>
            <Row label={t("archive.objectType")}>
              {["brand", "product", "service", "organization", "film", "game", "show", "event"].map(
                (k) => (
                  <Chip
                    key={k}
                    active={types.includes(k)}
                    onClick={() => toggle(types, k, setTypes)}
                  >
                    {objectType(k)}
                  </Chip>
                ),
              )}
            </Row>
            <Row label={t("archive.topicTag")}>
              {FEMINIST_TAGS.map((tagName) => (
                <Chip
                  key={tagName}
                  active={tags.includes(tagName)}
                  onClick={() => toggle(tags, tagName, setTags)}
                >
                  #{tag(tagName)}
                </Chip>
              ))}
            </Row>
            <Row label={t("archive.evidenceLevel")}>
              {(["A", "B", "C", "D"] as const).map((e) => (
                <Chip
                  key={e}
                  active={evidence.includes(e)}
                  onClick={() => toggle(evidence, e, setEvidence)}
                >
                  {e}
                </Chip>
              ))}
            </Row>
            <Row label={t("archive.temperatureRange", { min: tempRange[0], max: tempRange[1] })}>
              <input
                type="range"
                min={20}
                max={100}
                value={tempRange[0]}
                onChange={(e) => setTempRange([Number(e.target.value), tempRange[1]])}
                className="w-40 accent-[var(--accent)]"
              />
              <input
                type="range"
                min={20}
                max={100}
                value={tempRange[1]}
                onChange={(e) => setTempRange([tempRange[0], Number(e.target.value)])}
                className="w-40 accent-[var(--accent)]"
              />
            </Row>
          </PaperSheet>
        </div>
      </section>

      <section className="archive-desk py-10">
        <div className="container-prose">
          {loading && items.length === 0 ? (
            <PaperSheet tone="slip" className="p-10 text-center text-sm text-muted-foreground">
              {t("archive.searching")}
            </PaperSheet>
          ) : items.length === 0 ? (
            <PaperSheet tone="slip" className="p-10 text-center text-sm text-muted-foreground">
              {t("archive.noMatch")}
            </PaperSheet>
          ) : (
            <ul className="space-y-4">
              {items.map((it) => (
                <CaseRow key={it.id} item={it} />
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
              <span className="text-muted-foreground">
                {t("common.pageCount", { page, total: Math.ceil(total / 20) })}
              </span>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-2 min-w-[5.5rem] text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`paper-tag transition ${active ? "paper-tag-active" : "text-muted-foreground hover:border-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function CaseRow({ item }: { item: Item }) {
  const { language, t, objectType, tag, archiveCategory } = useI18n();
  const band = bandOf(item.object.temperature);
  return (
    <li>
      <Link to="/archive/$caseCode" params={{ caseCode: item.case_code }} className="group block">
        <PaperSheet
          tone="slip"
          className="p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-accent/50"
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="font-mono text-foreground">{item.case_code}</span>
            <span>{archiveCategory(item.archive_category)}</span>
            <ArchiveStamp className="archive-stamp-soft text-[10px]">
              {t("common.evidence")} {item.evidence_level}
            </ArchiveStamp>
            <span className="text-foreground">{item.object.name}</span>
            <span className="text-muted-foreground">({objectType(item.object.type)})</span>
            <span
              className="ml-auto font-serif text-base archive-highlight"
              style={{
                color: `var(--temp-${band.band === "comfort" ? "cool" : band.band === "minor" ? "neutral" : band.band === "notable" ? "warm" : band.band === "high" ? "hot" : "critical"})`,
              }}
            >
              {item.object.temperature.toFixed(1)}°C
            </span>
          </div>
          <p className="mt-2 text-base leading-relaxed group-hover:text-accent">
            {item.summary || t("common.noSummary")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.tags.slice(0, 6).map((t) => (
              <span key={t} className="paper-tag">
                #{tag(t)}
              </span>
            ))}
            <span className="ml-auto">{formatDateForLanguage(item.created_at, language)}</span>
          </div>
        </PaperSheet>
      </Link>
    </li>
  );
}
