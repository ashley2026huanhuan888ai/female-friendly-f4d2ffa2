import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  const [stats, setStats] = useState({ objects: 0, pendingObs: 0, pendingReq: 0 });
  useEffect(() => {
    (async () => {
      const [o, p, r] = await Promise.all([
        supabase.from("objects").select("*", { count: "exact", head: true }),
        supabase
          .from("observations")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("object_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      setStats({ objects: o.count ?? 0, pendingObs: p.count ?? 0, pendingReq: r.count ?? 0 });
    })();
  }, []);

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">概览</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="评估对象" value={stats.objects} to="/admin/objects" />
        <Stat label="待审核观察" value={stats.pendingObs} to="/admin/observations" />
        <Stat label="待审核申请" value={stats.pendingReq} to="/admin/requests" />
      </div>
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="block border border-border bg-card p-6 hover:border-foreground/40">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-3 font-serif text-5xl tabular-nums">{value}</div>
    </Link>
  );
}
