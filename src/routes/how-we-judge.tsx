import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useI18n, usePageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/how-we-judge")({
  head: () => ({
    meta: [
      { title: "了解平台如何判断 · 女性友好体验测评" },
      {
        name: "description",
        content:
          "平台如何把一条体验变成温度：原则、标签、证据等级与人工审核。汇总知识引擎与证据库两个入口。",
      },
      { property: "og:title", content: "了解平台如何判断" },
      {
        property: "og:description",
        content: "原则 → 标签 → 证据等级 → 人工复核 → 趋势温度。来源可追溯，支持纠错。",
      },
    ],
    links: [{ rel: "canonical", href: "/how-we-judge" }],
  }),
  component: HowWeJudgePage,
});

function HowWeJudgePage() {
  const { t } = useI18n();
  usePageMeta("seo.howWeJudge.title", "seo.howWeJudge.description");

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-14">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("howWeJudge.eyebrow")}
          </p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">{t("howWeJudge.title")}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("howWeJudge.body")}
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container-prose py-12">
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="flex items-start gap-3">
                <span className="font-mono text-xs tabular-nums text-accent">0{n}</span>
                <div>
                  <h3 className="font-serif text-base">
                    {t(`howWeJudge.steps.${n}.title` as never)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t(`howWeJudge.steps.${n}.body` as never)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14">
        <div className="container-prose grid gap-6 md:grid-cols-2">
          <Link
            to="/knowledge"
            className="group block border border-border p-8 hover:border-foreground"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Knowledge Engine
            </div>
            <h2 className="mt-3 font-serif text-2xl">
              {t("howWeJudge.card.knowledge.title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("howWeJudge.card.knowledge.body")}
            </p>
            <span className="mt-6 inline-block text-xs uppercase tracking-wider text-foreground group-hover:text-accent">
              {t("howWeJudge.card.knowledge.cta")} →
            </span>
          </Link>

          <Link
            to="/archive/evidence"
            className="group block border border-border p-8 hover:border-foreground"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Evidence Library · A
            </div>
            <h2 className="mt-3 font-serif text-2xl">
              {t("howWeJudge.card.evidence.title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("howWeJudge.card.evidence.body")}
            </p>
            <span className="mt-6 inline-block text-xs uppercase tracking-wider text-foreground group-hover:text-accent">
              {t("howWeJudge.card.evidence.cta")} →
            </span>
          </Link>
        </div>

        <div className="container-prose mt-10 text-sm text-muted-foreground">
          {t("howWeJudge.feedback")}{" "}
          <Link to="/feedback" className="underline underline-offset-4 hover:text-foreground">
            /feedback
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
