import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminGetOverviewCounts } from "@/lib/api/platform.functions";
import { comparePreviewProduction } from "@/lib/api/publish-check.functions";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const getCounts = useServerFn(adminGetOverviewCounts);
  const compare = useServerFn(comparePreviewProduction);
  const [stats, setStats] = useState({
    objects: 0,
    pendingObs: 0,
    pendingReq: 0,
    pendingComments: 0,
    pendingFeedback: 0,
    onlineNow: 0,
    todayOnline: 0,
  });
  useEffect(() => {
    getCounts({})
      .then((s) => setStats(s))
      .catch(() => {});
  }, [getCounts]);

  const { data: versionCheck } = useQuery({
    queryKey: ["publish-check", "overview-banner"],
    queryFn: () => compare({}),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const stale =
    versionCheck && versionCheck.preview.ok && versionCheck.production.ok && !versionCheck.match;

  return (
    <div className="container-prose py-12">
      {stale ? (
        <Link
          to="/admin/publish"
          className="mb-6 flex items-center justify-between gap-4 border border-[var(--archive-pink)] bg-[var(--archive-pink)]/10 px-4 py-3 text-sm hover:bg-[var(--archive-pink)]/20"
        >
          <span>
            ⚠ 预览有未发布到生产的更改（预览{" "}
            <code>{versionCheck!.preview.commit?.slice(0, 7)}</code> / 生产{" "}
            <code>{versionCheck!.production.commit?.slice(0, 7)}</code>）
          </span>
          <span className="text-xs underline">前往发布校验 →</span>
        </Link>
      ) : null}

      <h1 className="font-serif text-3xl">概览</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Stat label="当前在线" value={stats.onlineNow} />
        <Stat label="今日上线" value={stats.todayOnline} />
        <Stat label="评估对象" value={stats.objects} to="/admin/objects" />
        <Stat
          label="待审核观察"
          value={stats.pendingObs}
          to="/admin/observations"
          highlightWhenNonZero
        />
        <Stat
          label="待审核留言"
          value={stats.pendingComments}
          to="/admin/comments"
          highlightWhenNonZero
        />
        <Stat
          label="新建议"
          value={stats.pendingFeedback}
          to="/admin/feedback"
          highlightWhenNonZero
        />
        <Stat
          label="待审核申请"
          value={stats.pendingReq}
          to="/admin/requests"
          highlightWhenNonZero
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  to,
  highlightWhenNonZero = false,
}: {
  label: string;
  value: number;
  to?: string;
  highlightWhenNonZero?: boolean;
}) {
  const highlighted = highlightWhenNonZero && value !== 0;
  const content = (
    <>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div
        className={`mt-3 font-serif text-3xl ${highlighted ? "text-[var(--archive-pink)]" : ""}`}
      >
        {value}
      </div>
    </>
  );

  if (!to) {
    return <div className="border border-border bg-card p-6">{content}</div>;
  }

  return (
    <Link
      to={to}
      className="block border border-border bg-card p-6 transition hover:border-foreground"
    >
      {content}
    </Link>
  );
}
