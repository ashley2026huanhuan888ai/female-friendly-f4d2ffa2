import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Flag, MessageSquare, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-context";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";
import {
  createObjectComment,
  listMyCommentReactions,
  listObjectComments,
  reportObjectComment,
  toggleCommentHelpful,
} from "@/lib/api/comment.functions";

type Comment = {
  id: string;
  body: string;
  author_label: string;
  helpful_count: number;
  created_at: string;
};

const REPORT_REASONS = [
  "spam",
  "personal_attack",
  "privacy",
  "false_info",
  "off_topic",
  "other",
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

export function ObjectComments({ objectId }: { objectId: string }) {
  const { language, t } = useI18n();
  const { ready, user } = useAuth();
  const listComments = useServerFn(listObjectComments);
  const listReactions = useServerFn(listMyCommentReactions);
  const createComment = useServerFn(createObjectComment);
  const toggleHelpful = useServerFn(toggleCommentHelpful);
  const reportComment = useServerFn(reportObjectComment);

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("other");
  const [reportDetails, setReportDetails] = useState("");
  const reportReasonLabels: Record<ReportReason, string> = {
    spam: t("objectComments.reportReason.spam"),
    personal_attack: t("objectComments.reportReason.personal_attack"),
    privacy: t("objectComments.reportReason.privacy"),
    false_info: t("objectComments.reportReason.false_info"),
    off_topic: t("objectComments.reportReason.off_topic"),
    other: t("objectComments.reportReason.other"),
  };

  const canSubmit = useMemo(() => body.trim().length >= 2 && body.trim().length <= 800, [body]);

  const refreshHelpfulState = async (items: Comment[]) => {
    if (!user || items.length === 0) {
      setHelpfulIds(new Set());
      return;
    }
    try {
      const result = await listReactions({ data: { comment_ids: items.map((item) => item.id) } });
      setHelpfulIds(new Set(result.helpful_comment_ids));
    } catch {
      setHelpfulIds(new Set());
    }
  };

  const reload = async () => {
    setLoading(true);
    try {
      const result = await listComments({ data: { object_id: objectId, offset: 0, limit: 30 } });
      const items = (result.comments ?? []) as Comment[];
      setComments(items);
      setTotal(result.total ?? items.length);
      await refreshHelpfulState(items);
    } catch (error: any) {
      toast.error(error?.message || t("objectComments.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id, objectId]);

  const loadMore = async () => {
    if (loadingMore || comments.length >= total) return;
    setLoadingMore(true);
    try {
      const result = await listComments({
        data: { object_id: objectId, offset: comments.length, limit: 30 },
      });
      const next = (result.comments ?? []) as Comment[];
      const seen = new Set(comments.map((item) => item.id));
      const merged = [...comments, ...next.filter((item) => !seen.has(item.id))];
      setComments(merged);
      setTotal(result.total ?? merged.length);
      await refreshHelpfulState(merged);
    } catch (error: any) {
      toast.error(error?.message || t("objectComments.loadMoreFailed"));
    } finally {
      setLoadingMore(false);
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createComment({ data: { object_id: objectId, body } });
      setBody("");
      toast.success(t("objectComments.submitted"));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onHelpful = async (commentId: string) => {
    if (!user) {
      toast.error(t("objectComments.loginHelpful"));
      return;
    }
    try {
      const result = await toggleHelpful({ data: { comment_id: commentId } });
      setHelpfulIds((current) => {
        const next = new Set(current);
        if (result.helpful) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? { ...comment, helpful_count: result.helpful_count } : comment,
        ),
      );
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onReport = async (commentId: string) => {
    if (!user) {
      toast.error(t("objectComments.loginReport"));
      return;
    }
    try {
      await reportComment({
        data: {
          comment_id: commentId,
          reason: reportReason,
          details: reportDetails || null,
        },
      });
      toast.success(t("objectComments.reportSubmitted"));
      setReportFor(null);
      setReportReason("other");
      setReportDetails("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <section className="border-t border-border py-16">
      <div className="container-prose">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              {t("objectComments.eyebrow")}
            </div>
            <h2 className="mt-2 font-serif text-2xl">{t("objectComments.title")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("objectComments.body")}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {t("objectComments.publicCount", { count: total })}
          </span>
        </div>

        <div className="mt-6 border border-border bg-card p-4">
          {user ? (
            <>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={800}
                placeholder={t("objectComments.placeholder")}
                className="min-h-[96px] w-full resize-y border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{body.trim().length}/800</span>
                <button
                  onClick={onSubmit}
                  disabled={!canSubmit || submitting}
                  className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:bg-accent hover:border-accent disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {submitting ? t("objectComments.submitting") : t("objectComments.submit")}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{t("objectComments.loginBody")}</span>
              <Link
                to="/login"
                search={{ redirect: `/objects/${objectId}` }}
                className="border border-foreground px-4 py-2 text-xs text-foreground hover:bg-foreground hover:text-background"
              >
                {t("objectComments.login")}
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("objectComments.loading")}
          </p>
        ) : comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("objectComments.empty")}
          </p>
        ) : (
          <div className="mt-8 divide-y divide-border border-y border-border">
            {comments.map((comment) => {
              const helpful = helpfulIds.has(comment.id);
              return (
                <article key={comment.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{comment.author_label}</span>
                    <span>·</span>
                    <span>{formatDateForLanguage(comment.created_at, language)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onHelpful(comment.id)}
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs ${
                        helpful
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {comment.helpful_count > 0
                        ? t("common.helpfulCount", { count: comment.helpful_count })
                        : t("objectComments.helpful")}
                    </button>
                    <button
                      onClick={() => setReportFor(reportFor === comment.id ? null : comment.id)}
                      className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("objectComments.report")}
                    </button>
                  </div>

                  {reportFor === comment.id && (
                    <div className="mt-3 border border-dashed border-border bg-muted/20 p-3">
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={reportReason}
                          onChange={(event) =>
                            setReportReason(event.target.value as typeof reportReason)
                          }
                          className="border border-border bg-background px-2 py-1 text-xs"
                        >
                          {REPORT_REASONS.map((value) => (
                            <option key={value} value={value}>
                              {reportReasonLabels[value]}
                            </option>
                          ))}
                        </select>
                        <input
                          value={reportDetails}
                          onChange={(event) => setReportDetails(event.target.value)}
                          maxLength={500}
                          placeholder={t("objectComments.reportDetails")}
                          className="min-w-[200px] flex-1 border border-border bg-background px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => onReport(comment.id)}
                          className="border border-foreground bg-foreground px-3 py-1 text-xs text-background"
                        >
                          {t("objectComments.submitReport")}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {comments.length < total && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="border border-foreground/60 px-5 py-2 text-xs uppercase tracking-wider text-foreground hover:border-foreground disabled:opacity-50"
            >
              {loadingMore ? t("common.loading") : t("objectComments.loadMore")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
