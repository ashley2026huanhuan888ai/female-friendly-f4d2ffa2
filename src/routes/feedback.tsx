import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { submitPlatformFeedback } from "@/lib/api/feedback.functions";
import { useI18n, usePageMeta } from "@/lib/i18n";

const FEEDBACK_PROMPTS = [
  { labelKey: "feedback.prompt.addObject", textKey: "feedback.prompt.addObjectText" },
  { labelKey: "feedback.prompt.pageIssue", textKey: "feedback.prompt.pageIssueText" },
  { labelKey: "feedback.prompt.feature", textKey: "feedback.prompt.featureText" },
  { labelKey: "feedback.prompt.info", textKey: "feedback.prompt.infoText" },
] as const;

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "我想对平台创作者说 · 女性友好体验测评" },
      {
        name: "description",
        content: "向女性友好观察平台提交私密建议、疑问或补充内容。",
      },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { t } = useI18n();
  usePageMeta("feedback.title", "feedback.body");
  const submitFeedback = useServerFn(submitPlatformFeedback);
  const [message, setMessage] = useState("");
  const [contactType, setContactType] = useState<"" | "wechat" | "email" | "other">("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function addPrompt(text: string) {
    setMessage((current) => {
      const trimmed = current.trim();
      return trimmed ? `${trimmed}\n\n${text}` : text;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await submitFeedback({
        data: {
          message,
          contact,
          contact_type: contactType,
          website,
        },
      });
      setSubmitted(true);
      setMessage("");
      setContact("");
      setContactType("");
      setWebsite("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("feedback.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose max-w-3xl py-16">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Feedback
          </div>
          <h1 className="mt-4 font-serif text-4xl text-balance">{t("feedback.title")}</h1>
          <p className="mt-4 text-sm text-muted-foreground">{t("feedback.body")}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-prose max-w-3xl">
          {submitted ? (
            <div className="border border-border bg-card p-8">
              <h2 className="font-serif text-2xl">{t("feedback.successTitle")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("feedback.successBody")}</p>
              <Link
                to="/"
                className="mt-6 inline-block border border-foreground bg-foreground px-5 py-2.5 text-sm text-background hover:bg-accent hover:border-accent"
              >
                {t("feedback.backHome")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="feedback-message" className="text-sm font-medium">
                  {t("feedback.messageLabel")}
                </label>
                <div className="mt-3 border border-border bg-card/60 p-4">
                  <p className="text-xs text-muted-foreground">{t("feedback.promptIntro")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FEEDBACK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.labelKey}
                        type="button"
                        onClick={() => addPrompt(t(prompt.textKey))}
                        className="border border-border bg-paper px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                      >
                        {t(prompt.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={8}
                  placeholder={t("feedback.messagePlaceholder")}
                  className="mt-2 w-full resize-y border border-border bg-card px-4 py-3 text-sm outline-none focus:border-foreground"
                />
                <p className="mt-2 text-xs text-muted-foreground">{t("feedback.messageHint")}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div>
                  <label htmlFor="feedback-contact-type" className="text-sm font-medium">
                    {t("feedback.contactTypeLabel")}
                  </label>
                  <select
                    id="feedback-contact-type"
                    value={contactType}
                    onChange={(event) => setContactType(event.target.value as typeof contactType)}
                    className="mt-2 w-full border border-border bg-card px-4 py-2.5 text-sm"
                  >
                    <option value="">{t("feedback.contactTypeNone")}</option>
                    <option value="wechat">{t("feedback.contactTypeWechat")}</option>
                    <option value="email">{t("feedback.contactTypeEmail")}</option>
                    <option value="other">{t("feedback.contactTypeOther")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="feedback-contact" className="text-sm font-medium">
                    {t("feedback.contactLabel")}
                  </label>
                  <input
                    id="feedback-contact"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    maxLength={160}
                    placeholder={t("feedback.contactPlaceholder")}
                    className="mt-2 w-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
              </div>

              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <p className="border-l-2 border-border pl-4 text-xs text-muted-foreground">
                {t("feedback.privacy")}
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="border border-foreground bg-foreground px-6 py-3 text-sm text-background hover:bg-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("feedback.submitting") : t("feedback.submit")}
              </button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
