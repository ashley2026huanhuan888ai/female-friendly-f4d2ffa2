import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/components/auth-context";
import { useI18n, usePageMeta } from "@/lib/i18n";

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    nameKey: "pricing.basic.name",
    priceKey: "pricing.basic.price",
    periodKey: "pricing.subscription.period",
    bodyKey: "pricing.basic.body",
    ctaKey: "pricing.basic.cta",
    featureKeys: ["pricing.basic.featureA", "pricing.basic.featureB", "pricing.basic.featureC"],
  },
  {
    id: "pro",
    nameKey: "pricing.pro.name",
    priceKey: "pricing.pro.price",
    periodKey: "pricing.subscription.period",
    bodyKey: "pricing.pro.body",
    ctaKey: "pricing.pro.cta",
    featureKeys: ["pricing.pro.featureA", "pricing.pro.featureB", "pricing.pro.featureC"],
    featured: true,
  },
] as const;

const ONE_TIME_PLAN = {
  id: "one-time",
  nameKey: "pricing.oneTime.name",
  priceKey: "pricing.oneTime.price",
  periodKey: "pricing.oneTime.period",
  bodyKey: "pricing.oneTime.body",
  ctaKey: "pricing.oneTime.cta",
  featureKeys: ["pricing.oneTime.featureA", "pricing.oneTime.featureB", "pricing.oneTime.featureC"],
} as const;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "价格与支持 · 女性友好体验测评" },
      {
        name: "description",
        content: "订阅或一次性支持女性友好体验测评平台持续运行。",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useI18n();
  usePageMeta("seo.pricing.title", "seo.pricing.description");

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose grid gap-8 py-16 md:grid-cols-[1.4fr_0.8fr] md:py-20">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Membership
            </div>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-balance">
              {t("pricing.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
              {t("pricing.body")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                search={{ redirect: "/pricing" }}
                className="border border-foreground bg-foreground px-5 py-2.5 text-sm text-background hover:border-accent hover:bg-accent"
              >
                {t("pricing.signIn")}
              </Link>
              <Link
                to="/feedback"
                className="border border-foreground/60 px-5 py-2.5 text-sm text-foreground hover:border-foreground"
              >
                {t("pricing.contact")}
              </Link>
            </div>
          </div>
          <aside className="border border-border bg-card p-6">
            <div className="font-serif text-2xl">{t("pricing.note.title")}</div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("pricing.note.body")}</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="border-t border-border pt-3">{t("pricing.note.itemA")}</li>
              <li className="border-t border-border pt-3">{t("pricing.note.itemB")}</li>
              <li className="border-t border-border pt-3">{t("pricing.note.itemC")}</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-b border-border py-14">
        <div className="container-prose">
          <div className="grid gap-4 md:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-prose">
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <PlanCard plan={ONE_TIME_PLAN} compact />
            <div className="border border-border bg-paper p-6">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Billing
              </div>
              <h2 className="mt-3 font-serif text-3xl">{t("pricing.manage.title")}</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {t("pricing.manage.body")}
              </p>
              <ManageSubscriptionButton />
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function PlanCard({
  plan,
  compact = false,
}: {
  plan: (typeof SUBSCRIPTION_PLANS)[number] | typeof ONE_TIME_PLAN;
  compact?: boolean;
}) {
  const { t } = useI18n();

  return (
    <article
      className={`border p-6 ${
        "featured" in plan && plan.featured
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl">{t(plan.nameKey)}</h2>
          <p
            className={`mt-3 text-sm leading-6 ${
              "featured" in plan && plan.featured ? "text-background/75" : "text-muted-foreground"
            }`}
          >
            {t(plan.bodyKey)}
          </p>
        </div>
        {"featured" in plan && plan.featured && (
          <span className="border border-background/35 px-2 py-1 text-[11px] uppercase tracking-wider">
            {t("pricing.recommended")}
          </span>
        )}
      </div>

      <div className="mt-8 flex items-end gap-2">
        <span className="font-mono text-3xl tabular-nums">{t(plan.priceKey)}</span>
        <span
          className={`pb-1 text-xs ${
            "featured" in plan && plan.featured ? "text-background/65" : "text-muted-foreground"
          }`}
        >
          {t(plan.periodKey)}
        </span>
      </div>

      <ul
        className={`mt-7 space-y-3 text-sm ${compact ? "" : "min-h-32"} ${
          "featured" in plan && plan.featured ? "text-background/85" : ""
        }`}
      >
        {plan.featureKeys.map((featureKey) => (
          <li key={featureKey} className="flex gap-3">
            <span aria-hidden>+</span>
            <span>{t(featureKey)}</span>
          </li>
        ))}
      </ul>

      <CheckoutButton planId={plan.id} featured={"featured" in plan && plan.featured}>
        {t(plan.ctaKey)}
      </CheckoutButton>
    </article>
  );
}

function CheckoutButton({
  planId,
  featured,
  children,
}: {
  planId: string;
  featured?: boolean;
  children: string;
}) {
  const { t } = useI18n();
  const { ready, user } = useAuth();

  if (ready && !user) {
    return (
      <Link
        to="/login"
        search={{ redirect: "/pricing" }}
        className={`mt-8 inline-flex w-full items-center justify-center border px-4 py-3 text-sm ${
          featured
            ? "border-background bg-background text-foreground hover:bg-background/90"
            : "border-foreground bg-foreground text-background hover:border-accent hover:bg-accent"
        }`}
      >
        {t("pricing.loginToCheckout")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-lovable-payment-plan={planId}
      disabled={!ready}
      onClick={() => toast.info(t("pricing.checkoutPending"))}
      className={`mt-8 w-full border px-4 py-3 text-sm disabled:cursor-wait disabled:opacity-60 ${
        featured
          ? "border-background bg-background text-foreground hover:bg-background/90"
          : "border-foreground bg-foreground text-background hover:border-accent hover:bg-accent"
      }`}
    >
      {ready ? children : t("common.loading")}
    </button>
  );
}

function ManageSubscriptionButton() {
  const { t } = useI18n();
  const { ready, user } = useAuth();

  if (ready && !user) {
    return (
      <Link
        to="/login"
        search={{ redirect: "/pricing" }}
        className="mt-8 inline-flex border border-foreground px-5 py-2.5 text-sm hover:bg-foreground hover:text-background"
      >
        {t("pricing.loginToManage")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-lovable-customer-portal
      disabled={!ready}
      onClick={() => toast.info(t("pricing.portalPending"))}
      className="mt-8 border border-foreground px-5 py-2.5 text-sm hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-60"
    >
      {ready ? t("pricing.manage.cta") : t("common.loading")}
    </button>
  );
}
