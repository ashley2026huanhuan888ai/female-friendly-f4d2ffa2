import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import {
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/api/messages.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/messages/$peerId")({
  component: MessageThread,
});

function MessageThread() {
  const { peerId } = Route.useParams();
  const { ready, user } = useAuth();
  const { language, t } = useI18n();
  const fetchThread = useServerFn(listMessages);
  const markRead = useServerFn(markConversationRead);
  const sendFn = useServerFn(sendMessage);
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  type Pending = { tempId: string; body: string; created_at: string; status: "sending" | "failed" };
  const [pending, setPending] = useState<Pending[]>([]);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    (markAsRead = true) => {
      setStatus("loading");
      fetchThread({ data: { peer_id: peerId, limit: 100 } })
        .then(async (d) => {
          setData(d);
          setStatus("ready");
          if (markAsRead) {
            try {
              await markRead({ data: { peer_id: peerId } });
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => setStatus("error"));
    },
    [fetchThread, markRead, peerId],
  );

  useEffect(() => {
    if (!ready || !user) return;
    load();
  }, [ready, user, load]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages?.length, pending.length]);

  if (ready && !user) {
    return (
      <LoginPrompt
        title={t("messages.title")}
        body={t("messages.loginPrompt")}
        redirect={`/messages/${peerId}`}
      />
    );
  }

  const sendText = async (text: string, tempId: string) => {
    setPending((prev) =>
      prev.some((p) => p.tempId === tempId)
        ? prev.map((p) => (p.tempId === tempId ? { ...p, status: "sending" } : p))
        : [...prev, { tempId, body: text, created_at: new Date().toISOString(), status: "sending" }],
    );
    setSending(true);
    try {
      await sendFn({ data: { recipient_id: peerId, body: text } });
      setPending((prev) => prev.filter((p) => p.tempId !== tempId));
      toast.success(t("messages.sent"));
      load(false);
    } catch (e) {
      setPending((prev) =>
        prev.map((p) => (p.tempId === tempId ? { ...p, status: "failed" } : p)),
      );
      toast.error((e as Error).message || t("messages.sendFailed"), {
        action: { label: t("common.retry"), onClick: () => sendText(text, tempId) },
      });
    } finally {
      setSending(false);
    }
  };

  const doSend = () => {
    const text = body.trim();
    if (!text || sending) return;
    setBody("");
    sendText(text, `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  };

  const retryPending = (p: Pending) => sendText(p.body, p.tempId);
  const removePending = (tempId: string) =>
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));

  return (
    <SiteLayout>
      <section className="container-prose py-8">
        <Link to="/messages" className="text-xs text-muted-foreground hover:text-foreground">
          {t("messages.backToList")}
        </Link>
        <h1 className="mt-3 font-serif text-2xl">{data?.peer?.label ?? t("messages.title")}</h1>

        <div className="mt-6 max-h-[55vh] min-h-[240px] overflow-y-auto border border-border bg-card p-4">
          {status === "loading" && (
            <p className="text-sm text-muted-foreground">{t("messages.threadLoading")}</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">{t("common.loadError")}</p>
          )}
          {status === "ready" && data && (
            data.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("messages.threadEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.messages.map((m: any) => (
                  <li
                    key={m.id}
                    className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] border px-3 py-2 text-sm ${
                        m.from_me
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <div
                        className={`mt-1 text-[10px] ${
                          m.from_me ? "text-background/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatDateForLanguage(m.created_at, language, {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
          <div ref={listEndRef} />
        </div>

        <div className="mt-4 border border-border bg-card p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                doSend();
              }
            }}
            maxLength={2000}
            placeholder={t("messages.placeholder")}
            className="min-h-[72px] w-full resize-y border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{body.trim().length}/2000</span>
            <button
              onClick={doSend}
              disabled={sending || body.trim().length === 0}
              className="border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:bg-accent hover:border-accent disabled:opacity-50"
            >
              {sending ? t("messages.sending") : t("messages.send")}
            </button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
