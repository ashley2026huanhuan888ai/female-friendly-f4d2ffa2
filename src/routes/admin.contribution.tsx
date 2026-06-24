import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminAdjustPoints, adminListUserPoints } from "@/lib/api/contribution.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contribution")({
  component: AdminContribution,
});

function AdminContribution() {
  const list = useServerFn(adminListUserPoints);
  const adjust = useServerFn(adminAdjustPoints);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = () => {
    setLoading(true);
    list({ data: { q: q || undefined, limit: 100 } })
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAdjust = async (uid: string) => {
    const deltaStr = window.prompt("调整积分（正数加分，负数扣分）", "0");
    if (!deltaStr) return;
    const delta = Number(deltaStr);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("无效数值");
      return;
    }
    const reason = window.prompt("原因", "管理员调整");
    if (!reason) return;
    try {
      await adjust({ data: { user_id: uid, delta, reason } });
      toast.success("已调整");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="container-prose py-10">
      <h2 className="font-serif text-2xl">贡献积分管理</h2>

      <div className="mt-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索邮箱 / 昵称 / 邀请码"
          className="flex-1 border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
          onKeyDown={(e) => e.key === "Enter" && reload()}
        />
        <button onClick={reload} className="border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:bg-accent">
          搜索
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">加载中…</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="border-b border-border px-2 py-2">用户</th>
              <th className="border-b border-border px-2 py-2">邀请码</th>
              <th className="border-b border-border px-2 py-2 text-right">积分</th>
              <th className="border-b border-border px-2 py-2">等级</th>
              <th className="border-b border-border px-2 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="px-2 py-2">
                  <div>{u.display_name ?? u.email ?? u.id.slice(0, 8)}</div>
                  <div className="text-[11px] text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-2 py-2 font-mono text-xs">{u.invite_code}</td>
                <td className="px-2 py-2 text-right font-serif text-base text-accent">
                  {Number(u.contribution_points).toFixed(2)}
                </td>
                <td className="px-2 py-2">L{u.level} · {u.level_title}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => onAdjust(u.id)} className="border border-border px-2 py-1 text-xs hover:border-foreground">
                    调整
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
