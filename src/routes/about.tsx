import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { BANDS, FEMINIST_TAGS } from "@/lib/temperature";
import { useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于项目 · 女性友好体验测评" },
      { name: "description", content: "了解「女性友好体验测评」平台的方法论、温度逻辑与硬规则。" },
      { property: "og:title", content: "关于项目 · 女性友好体验测评" },
      { property: "og:description", content: "了解「女性友好体验测评」平台的方法论、温度逻辑与硬规则。" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  const { t, band: bandLabel, tag } = useI18n();
  usePageMeta("seo.about.title", "seo.about.description");
  return (
    <SiteLayout>
      <div className="container-prose max-w-3xl py-20">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Methodology
        </div>
        <h1 className="mt-4 font-serif text-5xl text-balance">{t("about.title")}</h1>

        <Section title={t("about.goal")}>
          <p>{t("about.goalBody")}</p>
          <p className="mt-3 text-muted-foreground">{t("about.goalDisclaimer")}</p>
        </Section>

        <Section title={t("about.bands")}>
          <div className="space-y-2">
            {BANDS.map((b) => (
              <div key={b.band} className="flex items-baseline gap-4 text-sm">
                <span
                  className="inline-block h-2 w-12 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="font-mono tabular-nums text-muted-foreground">
                  {b.range[0]}–{b.range[1]}°C
                </span>
                <span>{bandLabel(b.band, b.label)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("about.bandsHint")}</p>
        </Section>

        <Section title={t("about.evidence")}>
          <ul className="space-y-2 text-sm">
            <li>{t("about.evidenceA")}</li>
            <li>{t("about.evidenceB")}</li>
            <li>{t("about.evidenceC")}</li>
            <li>{t("about.evidenceD")}</li>
          </ul>
        </Section>

        <Section title={t("about.tags")}>
          <div className="flex flex-wrap gap-2">
            {FEMINIST_TAGS.map((tagName) => (
              <span key={tagName} className="border border-border px-3 py-1 text-xs">
                #{tag(tagName)}
              </span>
            ))}
          </div>
        </Section>

        <Section title={t("about.rules")}>
          <ul className="space-y-3 text-sm">
            <li>
              · {t("about.ruleObjects")}{" "}
              <Link to="/request-object" className="underline">
                {t("objects.requestLink")}
              </Link>
            </li>
            <li>· {t("about.ruleVoting")}</li>
            <li>· {t("about.ruleQuantity")}</li>
          </ul>
        </Section>

        <Section title={t("about.workflow")}>
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li>{t("about.step1")}</li>
            <li>{t("about.step2")}</li>
            <li>{t("about.step3")}</li>
            <li>{t("about.step4")}</li>
            <li>{t("about.step5")}</li>
            <li>{t("about.step6")}</li>
            <li>{t("about.step7")}</li>
          </ol>
        </Section>
      </div>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-4 text-base leading-relaxed">{children}</div>
    </section>
  );
}
