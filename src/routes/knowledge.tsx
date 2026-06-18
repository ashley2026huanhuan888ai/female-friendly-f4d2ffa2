import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import {
  listPrinciples,
  listTags,
  listCases,
  type Principle,
  type KTag,
  type KCase,
} from "@/lib/api/knowledge.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "知识引擎 · 女性友好测评" },
      {
        name: "description",
        content: "女性友好测评平台的原则、标签与案例知识库。所有 AI 分析均基于此知识库。",
      },
      { property: "og:title", content: "知识引擎 · 女性友好测评" },
      {
        property: "og:description",
        content: "女性友好测评平台的原则、标签与案例知识库。所有 AI 分析均基于此知识库。",
      },
    ],
    links: [{ rel: "canonical", href: "/knowledge" }],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const { language, t, polarity } = useI18n();
  usePageMeta("seo.knowledge.title", "seo.knowledge.description");
  const pFn = useServerFn(listPrinciples);
  const tFn = useServerFn(listTags);
  const cFn = useServerFn(listCases);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [tags, setTags] = useState<KTag[]>([]);
  const [cases, setCases] = useState<KCase[]>([]);
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "controversial">("all");

  useEffect(() => {
    pFn().then(setPrinciples);
    tFn().then((t) => setTags(t.filter((x) => x.active && !x.merged_into)));
    cFn({ data: {} }).then(setCases);
  }, [pFn, tFn, cFn]);

  const filteredCases = filter === "all" ? cases : cases.filter((c) => c.polarity === filter);

  return (
    <SiteLayout>
      <div className="container-prose py-16">
        <header className="border-b border-border pb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Knowledge Engine
          </p>
          <h1 className="mt-3 font-serif text-4xl">{t("knowledge.title")}</h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {t("knowledge.body")}
          </p>
        </header>

        {/* Principles */}
        <section className="mt-14">
          <h2 className="font-serif text-2xl">{t("knowledge.principles")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("knowledge.principlesHint")}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {principles.map((p) => (
              <div key={p.id} className="border border-border p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base">{p.name}</h3>
                  <span className="font-mono text-[10px] text-muted-foreground">{p.code}</span>
                </div>
                {p.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tags */}
        <section className="mt-14">
          <h2 className="font-serif text-2xl">{t("knowledge.tags")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("knowledge.tagsHint")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.id} className="border border-border px-3 py-1.5 text-sm">
                {language === "en" && t.name_en ? t.name_en : t.name_zh}
                {language === "en" && t.name_en && (
                  <span className="ml-2 text-xs text-muted-foreground">{t.name_zh}</span>
                )}
                {language === "zh" && t.name_en && (
                  <span className="ml-2 text-xs text-muted-foreground">{t.name_en}</span>
                )}
                <span className="ml-2 text-[10px] text-muted-foreground">w{t.weight}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Cases */}
        <section className="mt-14">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-serif text-2xl">{t("knowledge.cases")}</h2>
            <div className="flex gap-1 text-sm">
              {(["all", "positive", "negative", "controversial"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`px-3 py-1 border ${filter === k ? "border-foreground bg-foreground text-background" : "border-border"}`}
                >
                  {
                    {
                      all: t("knowledge.filterAll"),
                      positive: t("knowledge.filterPositive"),
                      negative: t("knowledge.filterNegative"),
                      controversial: t("knowledge.filterControversial"),
                    }[k]
                  }
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {filteredCases.map((c) => (
              <article key={c.id} className="border border-border p-5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">{c.code}</span>
                  <span
                    className={`px-2 py-0.5 border ${c.polarity === "positive" ? "border-emerald-500 text-emerald-700" : c.polarity === "negative" ? "border-destructive text-destructive" : "border-amber-500 text-amber-700"}`}
                  >
                    {polarity(c.polarity)}
                  </span>
                  {c.featured && <span className="text-amber-600">★</span>}
                </div>
                <h3 className="mt-2 font-serif text-lg">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.summary}</p>
                {(c.tags.length > 0 || c.principles.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {c.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-muted/40">
                        {t}
                      </span>
                    ))}
                    {c.principles.map((p) => (
                      <span key={p} className="px-2 py-0.5 bg-muted/40">
                        ⊕ {p}
                      </span>
                    ))}
                  </div>
                )}
                {c.source_url && (
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs underline text-muted-foreground"
                  >
                    {t("knowledge.source")}
                  </a>
                )}
              </article>
            ))}
            {filteredCases.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("knowledge.emptyCases")}</p>
            )}
          </div>
        </section>

        <p className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          {t("knowledge.footer")}
          <Link to="/about" className="ml-2 underline">
            {t("knowledge.learn")}
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}
