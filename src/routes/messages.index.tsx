import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { LoginPrompt } from "@/components/LoginPrompt";
import { useAuth } from "@/components/auth-context";
import { listConversations } from "@/lib/api/messages.functions";
import { formatDateForLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/messages/")({
  component: MessagesIndex,
});

function MessagesIndex() {
  const { ready, user } = useAuth();
  const { language, t } = useI18n();
  const fetchList = useServerFn(listConversations);
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!ready || !user) return;
    setStatus("loading");
    fetchList()
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [ready, user, fetchList]);

  if (ready && !user) {
    return (
      <LoginPrompt
        title={t("messages.title")}
        body={t("messages.loginPrompt")}
        redirect="/messages"
      />
    );
  }

  return (
    <SiteLayout>
      <section className="container-prose py-12">
        <h1 className="font-serif text-3xl">{t("messages.title")}</h1>
        {status === "loading" && (
          <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
        {status === "error" && (
          <p className="mt-8 text-sm text-destructive">{t("common.loadError")}</p>
        )}
        {status === "ready" && data && (
          data.conversations.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">{t("messages.empty")}</p>
          ) : (
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {data.conversations.map((c: any) => (
                <li key={c.peer_id}>
                  <Link
                    to="/messages/$peerId"
                    params={{ peerId: c.peer_id }}
                    className="flex items-start gap-3 py-4 hover:bg-card/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs text-muted-foreground">
                      {c.peer_avatar ? (
                        <img
                          src={c.peer_avatar}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        c.peer_label.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.peer_label}</span>
                        <span className="ml-auto">
                          {formatDateForLanguage(c.last_at, language, {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-sm">
                        {c.last_from_me ? `${t("messages.you")}: ` : ""}
                        {c.last_body}
                      </div>
                    </div>
                    {c.unread > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-background">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </SiteLayout>
  );
}
