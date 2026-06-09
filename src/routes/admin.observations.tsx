import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  reviewObservation,
  recomputeTemperature,
  regenerateObservation,
  updateObservation,
  deleteObservation,
  adminListObservations,
} from "@/lib/api/platform.functions";
import { FEMINIST_TAGS, TAG_WEIGHTS, EVIDENCE_STRENGTH } from "@/lib/temperature";
import { REJECTION_REASONS, RISK_LABEL } from "@/lib/reputation";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/observations")({
  component: ObsAdmin,
});

type Obs = {
  id: string;
  object_id: string;
  user_id: string;
  content: string;
  scene: string | null;
  screenshot_url: string | null;
  reference_url: string | null;
  cleaned_content: string | null;
  facts: string[];
  summary: string | null;
  evidence_level: "A" | "B" | "C" | "D" | null;
  tags: string[];
  confidence: number;
  impact_score: number;
  status: string;
  risk_level: "low" | "medium" | "high";
  risk_reasons: string[];
  rejection_reason: string | null;
  duplicate_of: string | null;
  similarity_score: number | null;
  principles_matched: string[] | null;
  cases_cited: string[] | null;
  explanation: string | null;
  created_at: string;
  objects: { id: string; name: string } | null;
};

function ObsAdmin() {
  const review = useServerFn(reviewObservation);
  const recompute = useServerFn(recomputeTemperature);
  const regen = useServerFn(regenerateObservation);
  const update = useServerFn(updateObservation);
  const del = useServerFn(deleteObservation);

  const [items, setItems] = useState<Obs[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [risk, setRisk] = useState<"all" | "low" | "medium" | "high">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("too_short");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchNote, setBatchNote] = useState("");
  const [batchReason, setBatchReason] = useState<string>("too_short");
  const [batchBusy, setBatchBusy] = useState(false);

  const reload = () => {
    let q = supabase
      .from("observations")
      .select("*, objects(id,name)")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(100);
    if (risk !== "all") q = q.eq("risk_level", risk);
    return q.then(({ data }) => {
      setItems((data ?? []) as unknown as Obs[]);
      setSelected(new Set());
    });
  };
  useEffect(() => {
    reload(); /* eslint-disable-next-line */
  }, [filter, risk]);

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))));

  const runBatch = async (action: "approve" | "reject") => {
    if (selected.size === 0) return;
    if (!confirm(`确认批量${action === "approve" ? "通过" : "驳回"} ${selected.size} 条？`)) return;
    setBatchBusy(true);
    const ids = [...selected];
    const objIds = new Set<string>();
    let ok = 0,
      fail = 0;
    for (const id of ids) {
      const obj = items.find((i) => i.id === id);
      try {
        await review({
          data: {
            id,
            action,
            rejection_reason: action === "reject" ? (batchReason as never) : undefined,
            note: batchNote || undefined,
          },
        });
        if (action === "approve" && obj) objIds.add(obj.object_id);
        ok++;
      } catch {
        fail++;
      }
    }
    for (const oid of objIds) recompute({ data: { object_id: oid } }).catch(() => {});
    setBatchBusy(false);
    toast.success(`批量${action === "approve" ? "通过" : "驳回"}完成：${ok} 成功 / ${fail} 失败`);
    setBatchNote("");
    reload();
  };

  const onApprove = async (id: string, objectId: string) => {
    try {
      setBusy(id);
      await review({ data: { id, action: "approve" } });
      toast.success("已通过");
      recompute({ data: { object_id: objectId } }).catch(() => {});
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (id: string) => {
    try {
      setBusy(id);
      await review({ data: { id, action: "reject", rejection_reason: rejectReason as never } });
      toast.success("已拒绝");
      setRejectFor(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onRegen = async (id: string) => {
    try {
      setBusy(id);
      await regen({ data: { id } });
      toast.success("已重新分析");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleTag = async (o: Obs, tag: string) => {
    const next = o.tags.includes(tag) ? o.tags.filter((t) => t !== tag) : [...o.tags, tag];
    try {
      setBusy(o.id);
      await update({ data: { id: o.id, tags: next } });
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setEvidence = async (o: Obs, ev: "A" | "B" | "C" | "D") => {
    try {
      setBusy(o.id);
      await update({ data: { id: o.id, evidence_level: ev } });
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("删除此观察？此操作不可撤销")) return;
    try {
      setBusy(id);
      await del({ data: { id } });
      toast.success("已删除");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const riskColor = (r: string) =>
    r === "high"
      ? "border-destructive text-destructive bg-destructive/5"
      : r === "medium"
        ? "border-temp-warm text-temp-warm bg-temp-warm/5"
        : "border-border text-muted-foreground";

  return (
    <div className="container-prose py-12">
      <h1 className="font-serif text-3xl">观察审核 · AI 风险与分析面板</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        贡献分 = Σ(标签权重) × 证据强度 × 置信度。D 级不参与计算。
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`border px-3 py-1.5 ${filter === s ? "border-foreground bg-foreground text-background" : "border-border"}`}
          >
            {s === "pending" ? "待审" : s === "approved" ? "已通过" : "已拒绝"}
          </button>
        ))}
        <span className="ml-4 self-center text-xs text-muted-foreground">风险：</span>
        {(["all", "low", "medium", "high"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRisk(r)}
            className={`border px-2.5 py-1 text-xs ${risk === r ? "border-foreground bg-foreground text-background" : "border-border"}`}
          >
            {r === "all" ? "全部" : RISK_LABEL[r]}
          </button>
        ))}
      </div>

      {filter === "pending" && items.length > 0 && (
        <div className="mt-4 border border-dashed border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selected.size === items.length}
                onChange={toggleAll}
              />
              <span>
                全选（已选 {selected.size}/{items.length}）
              </span>
            </label>
            <span className="ml-2 text-muted-foreground">驳回原因：</span>
            <select
              value={batchReason}
              onChange={(e) => setBatchReason(e.target.value)}
              className="border border-border bg-background px-2 py-1"
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}（{r.rep}）
                </option>
              ))}
            </select>
            <input
              type="text"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="审核备注（可选，应用于全部选中项）"
              className="min-w-[200px] flex-1 border border-border bg-background px-2 py-1"
            />
            <button
              onClick={() => runBatch("approve")}
              disabled={batchBusy || selected.size === 0}
              className="border border-foreground bg-foreground px-3 py-1 text-background disabled:opacity-40"
            >
              批量通过
            </button>
            <button
              onClick={() => runBatch("reject")}
              disabled={batchBusy || selected.size === 0}
              className="border border-destructive bg-destructive/10 px-3 py-1 text-destructive disabled:opacity-40"
            >
              批量驳回
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {items.map((o) => (
          <article key={o.id} className="border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {filter === "pending" && (
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={selected.has(o.id)}
                  onChange={() => toggleSel(o.id)}
                />
              )}
              {o.objects?.id ? (
                <Link
                  to="/objects/$id"
                  params={{ id: o.objects.id }}
                  target="_blank"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {o.objects.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{o.objects?.name ?? "—"}</span>
              )}
              <span>·</span>
              <span className={`border px-1.5 py-0.5 ${riskColor(o.risk_level)}`}>
                风险 {RISK_LABEL[o.risk_level]}
                {o.risk_reasons?.length > 0 && ` · ${o.risk_reasons.join(",")}`}
              </span>
              {o.duplicate_of && (
                <span className="border border-temp-warm px-1.5 py-0.5 text-temp-warm">
                  可能重复 {((o.similarity_score ?? 0) * 100).toFixed(0)}%
                </span>
              )}
              <span className="border border-border px-1.5 py-0.5">
                证据 {o.evidence_level ?? "—"}
              </span>
              <span className="border border-border px-1.5 py-0.5">
                置信度 {(Number(o.confidence) || 0).toFixed(2)}
              </span>
              <span className="border border-accent px-1.5 py-0.5 text-accent">
                贡献分 {Number(o.impact_score) || 0}
              </span>
              <span className="ml-auto">{new Date(o.created_at).toLocaleString("zh-CN")}</span>
            </div>

            {o.summary && <p className="mt-3 font-serif text-base leading-relaxed">{o.summary}</p>}
            {o.cleaned_content && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {o.cleaned_content}
              </p>
            )}

            {o.facts?.length > 0 && (
              <div className="mt-3 border-l-2 border-accent/40 pl-3">
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                  提取事实
                </div>
                <ul className="space-y-0.5 text-sm">
                  {o.facts.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {(o.explanation ||
              (o.principles_matched?.length ?? 0) > 0 ||
              (o.cases_cited?.length ?? 0) > 0) && (
              <div className="mt-3 border border-dashed border-accent/40 bg-accent/5 p-3">
                <div className="mb-1 text-xs uppercase tracking-wider text-accent">
                  可解释性 · Explainability
                </div>
                {o.explanation && <p className="text-sm">{o.explanation}</p>}
                {(o.principles_matched?.length ?? 0) > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    匹配原则：
                    {(o.principles_matched ?? []).map((p) => (
                      <span key={p} className="ml-1 px-1.5 py-0.5 bg-muted/40 font-mono">
                        {p}
                      </span>
                    ))}
                  </p>
                )}
                {(o.cases_cited?.length ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    引用案例：
                    {(o.cases_cited ?? []).map((c) => (
                      <span key={c} className="ml-1 px-1.5 py-0.5 bg-muted/40 font-mono">
                        {c}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                标签（点击编辑）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FEMINIST_TAGS.map((t) => {
                  const on = o.tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(o, t)}
                      disabled={busy === o.id}
                      className={`border px-2 py-0.5 text-xs ${on ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-foreground"}`}
                    >
                      {t} · w{TAG_WEIGHTS[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">证据等级：</span>
              {(["A", "B", "C", "D"] as const).map((ev) => (
                <button
                  key={ev}
                  onClick={() => setEvidence(o, ev)}
                  disabled={busy === o.id}
                  className={`border px-2 py-0.5 ${o.evidence_level === ev ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                >
                  {ev} · ×{EVIDENCE_STRENGTH[ev]}
                </button>
              ))}
            </div>

            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">原文 · 场景 · 链接</summary>
              <div className="mt-2 space-y-1">
                <div>
                  <strong>原文：</strong>
                  {o.content}
                </div>
                {o.scene && (
                  <div>
                    <strong>场景：</strong>
                    {o.scene}
                  </div>
                )}
                {o.screenshot_url && (
                  <div>
                    <strong>截图：</strong>
                    <a
                      href={o.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {o.screenshot_url}
                    </a>
                  </div>
                )}
                {o.reference_url && (
                  <div>
                    <strong>参考：</strong>
                    <a
                      href={o.reference_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {o.reference_url}
                    </a>
                  </div>
                )}
                {o.rejection_reason && (
                  <div>
                    <strong>驳回原因：</strong>
                    {REJECTION_REASONS.find((r) => r.value === o.rejection_reason)?.label}
                  </div>
                )}
              </div>
            </details>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filter === "pending" && rejectFor !== o.id && (
                <>
                  <button
                    onClick={() => onApprove(o.id, o.object_id)}
                    disabled={busy === o.id}
                    className="border border-foreground bg-foreground px-4 py-1.5 text-xs text-background hover:bg-accent"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => setRejectFor(o.id)}
                    disabled={busy === o.id}
                    className="border border-border px-4 py-1.5 text-xs hover:border-foreground"
                  >
                    驳回…
                  </button>
                </>
              )}
              {rejectFor === o.id && (
                <>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="border border-border bg-background px-2 py-1 text-xs"
                  >
                    {REJECTION_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}（{r.rep}）
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onReject(o.id)}
                    disabled={busy === o.id}
                    className="border border-destructive bg-destructive/10 px-4 py-1.5 text-xs text-destructive"
                  >
                    确认驳回
                  </button>
                  <button
                    onClick={() => setRejectFor(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    取消
                  </button>
                </>
              )}
              <button
                onClick={() => onRegen(o.id)}
                disabled={busy === o.id}
                className="border border-border px-4 py-1.5 text-xs hover:border-foreground"
              >
                {busy === o.id ? "处理中…" : "重新分析"}
              </button>
              {filter === "approved" && (
                <button
                  onClick={() =>
                    recompute({ data: { object_id: o.object_id } }).then(() =>
                      toast.success("已重算温度"),
                    )
                  }
                  disabled={busy === o.id}
                  className="border border-border px-4 py-1.5 text-xs hover:border-foreground"
                >
                  重算对象温度
                </button>
              )}
              <button
                onClick={() => onDelete(o.id)}
                disabled={busy === o.id}
                className="ml-auto border border-destructive/40 px-4 py-1.5 text-xs text-destructive hover:bg-destructive/5"
              >
                删除
              </button>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">无记录</p>
        )}
      </div>
    </div>
  );
}
