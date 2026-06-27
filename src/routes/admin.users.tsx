import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adjustReputation, adminListUsers } from "@/lib/api/platform.functions";
import { reputationLevel } from "@/lib/reputation";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: Users });

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  reputation: number;
  auto_approve: boolean;
  auth_created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  deleted_at: string | null;
  has_profile: boolean;
};

type UsersResponse = {
  users: AdminUser[];
  total: number;
  filtered_total: number;
  limit: number;
  truncated: boolean;
  synced_missing_profiles: number;
  synced_email_updates: number;
};

function Users() {
  const adjust = useServerFn(adjustReputation);
  const fetchUsers = useServerFn(adminListUsers);
  const [result, setResult] = useState<UsersResponse>({
    users: [],
    total: 0,
    filtered_total: 0,
    limit: 1000,
    truncated: false,
    synced_missing_profiles: 0,
    synced_email_updates: 0,
  });
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, { delta: string; reason: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await fetchUsers({ data: { q, limit: 1000 } })) as UsersResponse;
      setResult(data);
    } catch (err) {
      const message = (err as Error).message || "加载用户失败";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const onAdjust = async (id: string) => {
    const e = edits[id];
    if (!e?.delta || !e.reason) return toast.error("填写变更值与原因");
    try {
      await adjust({ data: { user_id: id, delta: Number(e.delta), reason: e.reason } });
      toast.success("已调整");
      setEdits({ ...edits, [id]: { delta: "", reason: "" } });
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const items = result.users;

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">用户信誉</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ≥80 自动通过；初始 50。高质量 +5、附证据 +10、被驳回 -10、广告 -20、攻击 -30。
      </p>

      <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
        <Metric label="Auth 注册总数" value={result.total} />
        <Metric label={q ? "搜索结果" : "当前显示"} value={result.filtered_total} />
        <Metric label="本次补齐资料" value={result.synced_missing_profiles} />
      </div>

      {(result.synced_missing_profiles > 0 || result.synced_email_updates > 0) && (
        <p className="mt-3 border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          已自动同步用户资料：补齐 {result.synced_missing_profiles} 个 profile，更新{" "}
          {result.synced_email_updates} 个邮箱。再次刷新后该数字应保持为 0 或稳定。
        </p>
      )}

      {result.truncated && (
        <p className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          用户数超过当前加载上限，仅显示前 {result.limit} 个 Auth 用户。
        </p>
      )}

      <input
        placeholder="按邮箱 / 昵称 / ID 搜索…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-6 w-full max-w-sm border border-border bg-card px-3 py-2 text-sm"
      />

      {error && (
        <div className="mt-6 border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="text-destructive">{error}</div>
          <button
            onClick={() => void reload()}
            className="mt-2 border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            重试
          </button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3">用户</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>最近登录</th>
              <th>信誉</th>
              <th>等级</th>
              <th>自动通过</th>
              <th>调整</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const lvl = reputationLevel(p.reputation);
              const e = edits[p.id] ?? { delta: "", reason: "" };
              return (
                <tr key={p.id} className="border-b border-border align-top">
                  <td className="py-3">
                    <div>{p.display_name || p.email || p.id.slice(0, 8)}</div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {p.email || p.id}
                    </div>
                    {!p.has_profile && (
                      <div className="mt-1 text-[11px] text-amber-700">已自动补齐资料</div>
                    )}
                  </td>
                  <td className="py-3 text-xs">{statusLabel(p)}</td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {formatDate(p.auth_created_at)}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {formatDate(p.last_sign_in_at)}
                  </td>
                  <td className="py-3 tabular-nums">{p.reputation}</td>
                  <td className="py-3 text-xs text-muted-foreground">{lvl.label}</td>
                  <td className="py-3 text-xs">{p.auto_approve ? "✓" : "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <input
                        type="number"
                        placeholder="±值"
                        value={e.delta}
                        onChange={(ev) =>
                          setEdits({ ...edits, [p.id]: { ...e, delta: ev.target.value } })
                        }
                        className="w-16 border border-border bg-background px-2 py-1 text-xs"
                      />
                      <input
                        placeholder="原因"
                        value={e.reason}
                        onChange={(ev) =>
                          setEdits({ ...edits, [p.id]: { ...e, reason: ev.target.value } })
                        }
                        className="w-32 border border-border bg-background px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => onAdjust(p.id)}
                        className="border border-border px-2 py-1 text-xs hover:border-foreground"
                      >
                        应用
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>}
      {!loading && !error && items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">暂无用户</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-3xl">{value}</div>
    </div>
  );
}

function statusLabel(user: AdminUser) {
  if (user.deleted_at) return "已删除";
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) return "已封禁";
  if (user.email_confirmed_at) return "已验证";
  return "未验证";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
