import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetOverviewCounts } from "@/lib/api/platform.functions";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const getCounts = useServerFn(adminGetOverviewCounts);
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

  return (
    <div className="container-prose py-12">
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
