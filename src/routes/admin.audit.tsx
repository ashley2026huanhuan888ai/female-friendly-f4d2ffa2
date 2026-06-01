import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/api/platform.functions";

export const Route = createFileRoute("/admin/audit")({ component: Audit });

type Log = {
  id: string; actor_id: string; action: string; target_type: string;
  target_id: string | null; before: unknown; after: unknown;
  reason: string | null; created_at: string;
};

function Audit() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => { fetchLogs({}).then((d) => setLogs(d as Log[])).catch(() => setLogs([])); }, []);

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">审计日志</h1>
      <p className="mt-2 text-sm text-muted-foreground">记录所有管理员操作，便于追溯。最近 200 条。</p>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-3">时间</th><th>操作</th><th>对象</th><th>管理员</th><th>原因</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-border align-top">
              <td className="py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("zh-CN")}</td>
              <td><span className="border border-border px-1.5 py-0.5 text-xs">{l.action}</span></td>
              <td className="text-xs text-muted-foreground">{l.target_type} · {l.target_id?.slice(0, 8)}</td>
              <td className="text-xs text-muted-foreground">{l.actor_id.slice(0, 8)}</td>
              <td className="text-xs">{l.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">暂无日志</p>}
    </div>
  );
}
