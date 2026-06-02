import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { previewBulkImport, commitBulkImport } from "@/lib/api/bulk-import.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bulk-import")({
  head: () => ({ meta: [{ title: "批量导入监管记录 · 管理后台" }] }),
  component: BulkImportPage,
});

type ObjectType = "brand" | "product" | "service" | "organization" | "film" | "game" | "show" | "event";

const TYPE_LABELS: Record<ObjectType, string> = {
  brand: "品牌", product: "产品", service: "服务", organization: "组织",
  film: "影视", game: "游戏", show: "节目", event: "事件",
};

interface PreviewRow {
  object_name: string;
  year: number | null;
  object_type: ObjectType;
  regulatory_authority: string | null;
  penalty_amount: string | null;
  penalty_description: string | null;
  violation_summary: string | null;
  original_problematic_text: string | null;
  evidence_level: "A" | "B" | "C" | "D";
  source_status: "已验证线索" | "待补源";
  tags: string[];
  suggested_temperature: number;
  raw_block: string;
  fingerprint: string;
  match_status: "匹配成功" | "需人工确认" | "新对象";
  matched_object_id: string | null;
  matched_object_name: string | null;
  match_confidence: number;
  duplicate: boolean;
  // local editable
  _action: "import" | "skip" | "new";
  _admin_temperature: number | null;
}

const PLACEHOLDER = `请粘贴品牌、平台、年份、罚单、监管处置、违法点、处罚金额等信息。

示例：

7‑Eleven 茂名门店｜2022
罚单：茂南区市监局 → 拟罚25万元（已立案查处，处罚告知书送达）
违法点：门店柠檬茶/mini酒广告写"她不醉，没机会"——把迷奸语境当促销梗`;

function BulkImportPage() {
  const preview = useServerFn(previewBulkImport);
  const commit = useServerFn(commitBulkImport);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof commit>> | null>(null);

  const onPreview = async () => {
    if (!text.trim()) { toast.error("请粘贴内容"); return; }
    setLoading(true);
    try {
      const r = await preview({ data: { text } });
      const mapped: PreviewRow[] = r.records.map((x) => ({
        ...x,
        _action: x.duplicate ? "skip" : (x.match_status === "新对象" ? "new" : "import"),
        _admin_temperature: null,
      }));
      setRows(mapped);
      setSummary(null);
      toast.success(`解析出 ${mapped.length} 条记录`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  const onCommit = async () => {
    const items = rows.filter((r) => r._action !== "skip").map((r) => ({
      object_name: r.object_name,
      object_type: r.object_type,
      matched_object_id: r._action === "new" ? null : r.matched_object_id,
      create_new: r._action === "new",
      year: r.year,
      regulatory_authority: r.regulatory_authority,
      penalty_amount: r.penalty_amount,
      penalty_description: r.penalty_description,
      violation_summary: r.violation_summary,
      original_problematic_text: r.original_problematic_text,
      evidence_level: r.evidence_level,
      source_status: r.source_status,
      tags: r.tags,
      raw_block: r.raw_block,
      fingerprint: r.fingerprint,
      admin_temperature: r._admin_temperature,
    }));
    if (items.length === 0) { toast.error("没有可导入项"); return; }
    setLoading(true);
    try {
      const s = await commit({ data: { items } });
      setSummary(s);
      toast.success(`已导入 ${s.imported} 条`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  const updateRow = (i: number, patch: Partial<PreviewRow>) => {
    setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  return (
    <div className="container-prose py-8">
      <h1 className="font-serif text-2xl">批量导入监管记录</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        粘贴多条记录（每条记录之间用空行分隔）。系统将解析、匹配对象、并在你确认后写入审核已通过的管理员观察。
      </p>

      <textarea
        className="mt-4 w-full min-h-[240px] rounded border border-border bg-background p-3 font-mono text-sm"
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={onPreview}
          disabled={loading}
          className="border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {loading ? "解析中…" : "解析预览"}
        </button>
        {rows.length > 0 && (
          <button
            onClick={onCommit}
            disabled={loading}
            className="border border-foreground bg-foreground px-4 py-2 text-sm text-background hover:bg-accent disabled:opacity-50"
          >
            确认写入（{rows.filter((r) => r._action !== "skip").length} 条）
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted">
              <tr>
                {["状态","操作","解析对象","匹配","年份","类型","机构","金额","违法点","原文","证据","来源","标签","建议°C","手动°C"].map((h) => (
                  <th key={h} className="border border-border px-2 py-1 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.duplicate ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                  <td className="border border-border px-2 py-1">
                    <span className={
                      r.match_status === "匹配成功" ? "text-green-600" :
                      r.match_status === "需人工确认" ? "text-orange-600" : "text-blue-600"
                    }>{r.match_status}</span>
                    {r.duplicate && <div className="text-yellow-700">可能重复</div>}
                    {r.source_status === "待补源" && <div className="text-orange-600">待补源</div>}
                  </td>
                  <td className="border border-border px-2 py-1">
                    <select
                      value={r._action}
                      onChange={(e) => updateRow(i, { _action: e.target.value as PreviewRow["_action"] })}
                      className="border border-border bg-background text-xs"
                    >
                      {r.matched_object_id && <option value="import">使用匹配对象</option>}
                      <option value="new">新建对象</option>
                      <option value="skip">跳过</option>
                    </select>
                  </td>
                  <td className="border border-border px-2 py-1">
                    <input value={r.object_name} onChange={(e) => updateRow(i, { object_name: e.target.value })}
                      className="w-32 border-0 bg-transparent" />
                  </td>
                  <td className="border border-border px-2 py-1">
                    {r.matched_object_name ?? "—"}
                    {r.match_confidence > 0 && <div className="text-muted-foreground">{r.match_confidence.toFixed(2)}</div>}
                  </td>
                  <td className="border border-border px-2 py-1">{r.year ?? "—"}</td>
                  <td className="border border-border px-2 py-1">
                    <select value={r.object_type} onChange={(e) => updateRow(i, { object_type: e.target.value as ObjectType })}
                      className="border border-border bg-background text-xs">
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="border border-border px-2 py-1">{r.regulatory_authority ?? "—"}</td>
                  <td className="border border-border px-2 py-1">{r.penalty_amount ?? "—"}</td>
                  <td className="border border-border px-2 py-1 max-w-[180px]">{r.violation_summary ?? "—"}</td>
                  <td className="border border-border px-2 py-1 max-w-[180px] text-muted-foreground">{r.original_problematic_text ?? "—"}</td>
                  <td className="border border-border px-2 py-1 font-mono">{r.evidence_level}</td>
                  <td className="border border-border px-2 py-1">{r.source_status}</td>
                  <td className="border border-border px-2 py-1 max-w-[160px]">{r.tags.join("、") || "—"}</td>
                  <td className="border border-border px-2 py-1 font-mono">{r.suggested_temperature}</td>
                  <td className="border border-border px-2 py-1">
                    <input type="number" min={20} max={100}
                      value={r._admin_temperature ?? ""}
                      onChange={(e) => updateRow(i, { _admin_temperature: e.target.value ? Number(e.target.value) : null })}
                      className="w-16 border border-border bg-background px-1" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <div className="mt-8 border border-border p-4">
          <h2 className="font-serif text-xl">导入结果</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            <div>解析总数：{summary.total}</div>
            <div>已导入：{summary.imported}</div>
            <div>跳过：{summary.skipped}</div>
            <div>新建对象：{summary.created_objects}</div>
            <div>更新对象：{summary.updated_objects}</div>
            <div>待补源：{summary.need_source_supplement}</div>
          </div>
          <table className="mt-4 w-full text-xs">
            <thead className="bg-muted"><tr>
              {["对象","最终温度","触发规则","证据","标签","备注"].map((h) => <th key={h} className="border border-border px-2 py-1 text-left">{h}</th>)}
            </tr></thead>
            <tbody>
              {summary.results.map((r, i) => (
                <tr key={i}>
                  <td className="border border-border px-2 py-1">{r.object_name}</td>
                  <td className="border border-border px-2 py-1 font-mono">{r.final_temperature ?? "—"}</td>
                  <td className="border border-border px-2 py-1">{r.triggered_rules.join(" / ") || "—"}</td>
                  <td className="border border-border px-2 py-1">{r.evidence_level}</td>
                  <td className="border border-border px-2 py-1">{r.tags.join("、") || "—"}</td>
                  <td className="border border-border px-2 py-1 text-destructive">{r.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
