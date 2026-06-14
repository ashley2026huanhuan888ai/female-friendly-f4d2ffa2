import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminListPlatformFeedback,
  adminUpdatePlatformFeedbackStatus,
} from "@/lib/api/feedback.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

type FeedbackStatus = "all" | "new" | "reviewed" | "archived";
type FeedbackRow = {
  id: string;
  message: string;
  contact_type: "wechat" | "email" | "other" | null;
  contact: string | null;
  status: "new" | "reviewed" | "archived";
  created_at: string;
};

const STATUS_OPTIONS: FeedbackStatus[] = ["new", "reviewed", "archived", "all"];

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedback,
});

function AdminFeedback() {
  const { language } = useI18n();
  const listFeedback = useServerFn(adminListPlatformFeedback);
  const updateStatus = useServerFn(adminUpdatePlatformFeedbackStatus);
  const [status, setStatus] = useState<FeedbackStatus>("new");
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listFeedback({ data: { status, limit: 100 } })
      .then((rows) => {
        if (!cancelled) setItems(rows as FeedbackRow[]);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "建议加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, listFeedback]);

  async function setItemStatus(id: string, nextStatus: Exclude<FeedbackStatus, "all">) {
    setUpdatingId(id);
    try {
      await updateStatus({ data: { id, status: nextStatus } });
      setItems((current) =>
        current
          .map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
          .filter((item) => status === "all" || item.status === status),
      );
      toast.success("状态已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "状态更新失败");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="container-prose py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl">平台建议</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            私密反馈收件箱。联系方式仅用于必要时进一步沟通，不公开展示。
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as FeedbackStatus)}
          className="border border-border bg-card px-4 py-2.5 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {statusLabel(option)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          暂无建议。
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.id} className="py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {formatDateForLanguage(item.created_at, language)} · {statusLabel(item.status)}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    联系方式：
                    {item.contact
                      ? `${contactTypeLabel(item.contact_type)} ${item.contact}`
                      : "未留下"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {(["new", "reviewed", "archived"] as const).map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => setItemStatus(item.id, nextStatus)}
                      disabled={updatingId === item.id || item.status === nextStatus}
                      className="border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {statusLabel(nextStatus)}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(status: FeedbackStatus | Exclude<FeedbackStatus, "all">) {
  const labels: Record<FeedbackStatus, string> = {
    new: "新建议",
    reviewed: "已处理",
    archived: "已归档",
    all: "全部",
  };
  return labels[status];
}

function contactTypeLabel(type: FeedbackRow["contact_type"]) {
  if (type === "wechat") return "微信";
  if (type === "email") return "邮箱";
  if (type === "other") return "其他";
  return "";
}
