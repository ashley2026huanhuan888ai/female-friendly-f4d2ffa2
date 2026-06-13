import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Flag, MessageSquare, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-context";
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
  report_count: number;
  created_at: string;
};

const REPORT_REASONS = [
  ["spam", "广告或刷屏"],
  ["personal_attack", "人身攻击"],
  ["privacy", "隐私风险"],
  ["false_info", "不实信息"],
  ["off_topic", "偏离主题"],
  ["other", "其他"],
] as const;

export function ObjectComments({ objectId }: { objectId: string }) {
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
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number][0]>("other");
  const [reportDetails, setReportDetails] = useState("");

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
      toast.error(error?.message || "留言加载失败");
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
      toast.error(error?.message || "加载更多留言失败");
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
      toast.success("留言已提交，审核通过后公开");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onHelpful = async (commentId: string) => {
    if (!user) {
      toast.error("登录后可以标记有帮助");
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
      toast.error("登录后可以举报留言");
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
      toast.success("已提交举报，管理员会处理");
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
              Discussion
            </div>
            <h2 className="mt-2 font-serif text-2xl">对象留言</h2>
            <p className="mt-1 text-xs text-muted-foreground">留言用于补充讨论，不参与温度计算。</p>
          </div>
          <span className="text-xs text-muted-foreground">已公开 {total} 条</span>
        </div>

        <div className="mt-6 border border-border bg-card p-4">
          {user ? (
            <>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={800}
                placeholder="写下补充、疑问或相关背景。"
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
                  {submitting ? "提交中…" : "提交留言"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>登录后可以留言、标记有帮助或举报。</span>
              <Link
                to="/login"
                search={{ redirect: `/objects/${objectId}` }}
                className="border border-foreground px-4 py-2 text-xs text-foreground hover:bg-foreground hover:text-background"
              >
                登录
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">留言加载中…</p>
        ) : comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无公开留言。</p>
        ) : (
          <div className="mt-8 divide-y divide-border border-y border-border">
            {comments.map((comment) => {
              const helpful = helpfulIds.has(comment.id);
              return (
                <article key={comment.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{comment.author_label}</span>
                    <span>·</span>
                    <span>{new Date(comment.created_at).toLocaleString("zh-CN")}</span>
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
                      有帮助 {comment.helpful_count > 0 ? comment.helpful_count : ""}
                    </button>
                    <button
                      onClick={() => setReportFor(reportFor === comment.id ? null : comment.id)}
                      className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      举报
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
                          {REPORT_REASONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={reportDetails}
                          onChange={(event) => setReportDetails(event.target.value)}
                          maxLength={500}
                          placeholder="补充说明（可选）"
                          className="min-w-[200px] flex-1 border border-border bg-background px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => onReport(comment.id)}
                          className="border border-foreground bg-foreground px-3 py-1 text-xs text-background"
                        >
                          提交举报
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
              {loadingMore ? "加载中…" : "加载更多留言"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
