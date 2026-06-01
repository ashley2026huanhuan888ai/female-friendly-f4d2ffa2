import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adjustReputation } from "@/lib/api/platform.functions";
import { reputationLevel } from "@/lib/reputation";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: Users });

type Profile = {
  id: string; email: string | null; display_name: string | null;
  reputation: number; auto_approve: boolean;
};

function Users() {
  const adjust = useServerFn(adjustReputation);
  const [items, setItems] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, { delta: string; reason: string }>>({});

  const reload = () => {
    let query = supabase.from("profiles").select("id,email,display_name,reputation,auto_approve")
      .order("reputation", { ascending: false }).limit(100);
    if (q) query = query.ilike("email", `%${q}%`);
    return query.then(({ data }) => setItems((data ?? []) as Profile[]));
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [q]);

  const onAdjust = async (id: string) => {
    const e = edits[id]; if (!e?.delta || !e.reason) return toast.error("填写变更值与原因");
    try {
      await adjust({ data: { user_id: id, delta: Number(e.delta), reason: e.reason } });
      toast.success("已调整"); setEdits({ ...edits, [id]: { delta: "", reason: "" } }); reload();
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">用户信誉</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ≥80 自动通过；初始 50。高质量 +5、附证据 +10、被驳回 -10、广告 -20、攻击 -30。
      </p>

      <input placeholder="按邮箱搜索…" value={q} onChange={(e) => setQ(e.target.value)}
        className="mt-6 w-full max-w-sm border border-border bg-card px-3 py-2 text-sm" />

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-3">用户</th><th>信誉</th><th>等级</th><th>自动通过</th><th>调整</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const lvl = reputationLevel(p.reputation);
            const e = edits[p.id] ?? { delta: "", reason: "" };
            return (
              <tr key={p.id} className="border-b border-border align-top">
                <td className="py-3">{p.display_name || p.email || p.id.slice(0, 8)}</td>
                <td className="tabular-nums">{p.reputation}</td>
                <td className="text-xs text-muted-foreground">{lvl.label}</td>
                <td className="text-xs">{p.auto_approve ? "✓" : "—"}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <input type="number" placeholder="±值" value={e.delta}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, delta: ev.target.value } })}
                      className="w-16 border border-border bg-background px-2 py-1 text-xs" />
                    <input placeholder="原因" value={e.reason}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, reason: ev.target.value } })}
                      className="w-32 border border-border bg-background px-2 py-1 text-xs" />
                    <button onClick={() => onAdjust(p.id)}
                      className="border border-border px-2 py-1 text-xs hover:border-foreground">应用</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">暂无用户</p>}
    </div>
  );
}
