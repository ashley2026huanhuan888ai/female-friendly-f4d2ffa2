import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Flag, MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminDeleteObjectComment,
  adminListObjectComments,
  adminModerateObjectComment,
  adminResolveCommentReports,
} from "@/lib/api/comment.functions";

export const Route = createFileRoute("/admin/comments")({
  component: CommentsAdmin,
});

type CommentStatus = "all" | "pending" | "approved" | "rejected" | "hidden";

type AdminComment = {
  id: string;
  object_id: string;
  body: string;
  status: Exclude<CommentStatus, "all">;
  author_label: string;
  helpful_count: number;
  report_count: number;
  created_at: string;
  objects: { id: string; name: string; type: string } | null;
  reports: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
  }>;
};

const STATUS_LABEL: Record<CommentStatus, string> = {
  all: "全部",
  pending: "待审",
  approved: "已公开",
  rejected: "已拒绝",
  hidden: "已隐藏",
};

const REPORT_LABEL: Record<string, string> = {
  spam: "广告或刷屏",
  personal_attack: "人身攻击",
  privacy: "隐私风险",
  false_info: "不实信息",
  off_topic: "偏离主题",
  other: "其他",
};

function CommentsAdmin() {
  const listComments = useServerFn(adminListObjectComments);
  const moderate = useServerFn(adminModerateObjectComment);
  const deleteComment = useServerFn(adminDeleteObjectComment);
  const resolveReports = useServerFn(adminResolveCommentReports);

  const [items, setItems] = useState<AdminComment[]>([]);
  const [status, setStatus] = useState<CommentStatus>("pending");
  const [reported, setReported] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await listComments({ data: { status, reported, q, limit: 100 } });
      setItems((rows ?? []) as AdminComment[]);
    } catch (error: any) {
      toast.error(error?.message || "留言加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reported]);

  const onModerate = async (id: string, nextStatus: AdminComment["status"]) => {
    setBusy(id);
    try {
      await moderate({ data: { id, status: nextStatus } });
      toast.success(`已${STATUS_LABEL[nextStatus]}`);
      reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("删除此留言？此操作不可撤销")) return;
    setBusy(id);
    try {
      await deleteComment({ data: { id } });
      toast.success("已删除留言");
      reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onResolveReports = async (commentId: string, nextStatus: "resolved" | "dismissed") => {
    setBusy(commentId);
    try {
      await resolveReports({ data: { comment_id: commentId, status: nextStatus } });
      toast.success(nextStatus === "resolved" ? "已处理举报" : "已驳回举报");
      reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container-prose py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Comment Moderation
          </div>
          <h1 className="mt-2 font-serif text-3xl">留言审核</h1>
          <p className="mt-2 text-sm text-muted-foreground">留言是社区讨论层，不进入温度计算。</p>
        </div>
        <button
          onClick={reload}
          className="border border-border px-4 py-2 text-xs uppercase tracking-wider hover:border-foreground"
        >
          刷新
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "hidden", "all"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`border px-3 py-1.5 text-sm ${
              status === item
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABEL[item]}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={reported}
            onChange={(event) => setReported(event.target.checked)}
          />
          只看有举报
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") reload();
          }}
          placeholder="搜索留言正文"
          className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          onClick={reload}
          className="border border-foreground bg-foreground px-4 py-2 text-xs text-background"
        >
          搜索
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">暂无留言。</p>
      ) : (
        <div className="mt-8 space-y-5">
          {items.map((comment) => {
            const openReports = comment.reports.filter((report) => report.status === "open");
            return (
              <article key={comment.id} className="border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="border border-border px-1.5 py-0.5">
                    {STATUS_LABEL[comment.status]}
                  </span>
                  {comment.objects?.id ? (
                    <Link
                      to="/objects/$id"
                      params={{ id: comment.objects.id }}
                      target="_blank"
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {comment.objects.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">对象不存在</span>
                  )}
                  <span>·</span>
                  <span>{comment.author_label}</span>
                  <span className="ml-auto">
                    {new Date(comment.created_at).toLocaleString("zh-CN")}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 border border-border px-2 py-1 text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    有帮助 {comment.helpful_count}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 border px-2 py-1 ${
                      openReports.length
                        ? "border-destructive text-destructive"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    未处理举报 {openReports.length}
                  </span>
                </div>

                {openReports.length > 0 && (
                  <div className="mt-3 border border-dashed border-destructive/40 bg-destructive/5 p-3">
                    <div className="text-xs font-medium text-destructive">举报记录</div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {openReports.slice(0, 4).map((report) => (
                        <li key={report.id}>
                          {REPORT_LABEL[report.reason] ?? report.reason}
                          {report.details ? `：${report.details}` : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => onResolveReports(comment.id, "resolved")}
                        disabled={busy === comment.id}
                        className="border border-foreground bg-foreground px-3 py-1 text-xs text-background disabled:opacity-40"
                      >
                        标记已处理
                      </button>
                      <button
                        onClick={() => onResolveReports(comment.id, "dismissed")}
                        disabled={busy === comment.id}
                        className="border border-border px-3 py-1 text-xs hover:border-foreground disabled:opacity-40"
                      >
                        驳回举报
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {comment.status !== "approved" && (
                    <button
                      onClick={() => onModerate(comment.id, "approved")}
                      disabled={busy === comment.id}
                      className="border border-foreground bg-foreground px-4 py-1.5 text-xs text-background hover:bg-accent disabled:opacity-40"
                    >
                      公开
                    </button>
                  )}
                  {comment.status !== "hidden" && (
                    <button
                      onClick={() => onModerate(comment.id, "hidden")}
                      disabled={busy === comment.id}
                      className="border border-border px-4 py-1.5 text-xs hover:border-foreground disabled:opacity-40"
                    >
                      隐藏
                    </button>
                  )}
                  {comment.status !== "rejected" && (
                    <button
                      onClick={() => onModerate(comment.id, "rejected")}
                      disabled={busy === comment.id}
                      className="border border-border px-4 py-1.5 text-xs hover:border-foreground disabled:opacity-40"
                    >
                      拒绝
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(comment.id)}
                    disabled={busy === comment.id}
                    className="ml-auto inline-flex items-center gap-1.5 border border-destructive/40 px-4 py-1.5 text-xs text-destructive hover:bg-destructive/5 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
