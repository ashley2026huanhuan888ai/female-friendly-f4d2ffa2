import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listPrinciples, upsertPrinciple, deletePrinciple,
  listTags, upsertTag, mergeTag,
  listCases, listAllCasesAdmin, upsertCase, deleteCase,
  getKnowledgeOverview,
  type Principle, type KTag, type KCase,
} from "@/lib/api/knowledge.functions";

export const Route = createFileRoute("/admin/knowledge")({
  head: () => ({ meta: [{ title: "知识引擎 · 管理后台" }] }),
  component: KnowledgeAdmin,
});

type Tab = "overview" | "principles" | "tags" | "cases";

function KnowledgeAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div className="container-prose py-10">
      <h1 className="font-serif text-3xl">知识引擎</h1>
      <p className="mt-2 text-sm text-muted-foreground">原则 · 标签 · 案例。AI 所有分析都基于此知识库。</p>
      <div className="mt-6 flex gap-1 border-b border-border text-sm">
        {([
          ["overview", "概览"],
          ["principles", "原则"],
          ["tags", "标签"],
          ["cases", "案例"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 -mb-px border-b-2 ${tab === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === "overview" && <OverviewPanel />}
        {tab === "principles" && <PrinciplesPanel />}
        {tab === "tags" && <TagsPanel />}
        {tab === "cases" && <CasesPanel />}
      </div>
    </div>
  );
}

function OverviewPanel() {
  const fn = useServerFn(getKnowledgeOverview);
  const [d, setD] = useState<Awaited<ReturnType<typeof getKnowledgeOverview>> | null>(null);
  useEffect(() => { fn().then(setD).catch(() => {}); }, [fn]);
  if (!d) return <p className="text-sm text-muted-foreground">加载中…</p>;
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Stat label="活跃原则" v={d.principles_active} />
      <Stat label="活跃标签" v={d.tags_active} />
      <Stat label="已发布案例" v={d.cases_total} />
      <Stat label="正向 / 负向 / 争议"
        v={`${d.by_polarity.positive ?? 0} / ${d.by_polarity.negative ?? 0} / ${d.by_polarity.controversial ?? 0}`} />
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="border border-border p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-3xl">{v}</div>
    </div>
  );
}

// ---------------- Principles ----------------
function PrinciplesPanel() {
  const list = useServerFn(listPrinciples);
  const upsert = useServerFn(upsertPrinciple);
  const del = useServerFn(deletePrinciple);
  const [rows, setRows] = useState<Principle[]>([]);
  const [edit, setEdit] = useState<Partial<Principle> | null>(null);

  const refresh = () => list().then(setRows);
  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} 条原则</p>
        <button onClick={() => setEdit({ code: "", name: "", weight: 1, active: true, display_order: rows.length + 1 })}
          className="border border-foreground px-3 py-1.5 text-sm hover:bg-foreground hover:text-background">新增原则</button>
      </div>
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3 text-left">code</th><th className="p-3 text-left">名称</th><th className="p-3 text-left">描述</th><th className="p-3">权重</th><th className="p-3">启用</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{p.code}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.description}</td>
                <td className="p-3 text-center">{p.weight}</td>
                <td className="p-3 text-center">{p.active ? "✓" : "—"}</td>
                <td className="p-3 text-center">
                  <button onClick={() => setEdit(p)} className="text-xs underline mr-3">编辑</button>
                  <button onClick={async () => { if (confirm("删除？")) { await del({ data: { id: p.id } }); refresh(); } }}
                    className="text-xs underline text-destructive">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)} title={edit.id ? "编辑原则" : "新增原则"}>
          <div className="space-y-3">
            <Field label="code"><input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className="input" /></Field>
            <Field label="名称"><input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input" /></Field>
            <Field label="描述"><textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="input min-h-[80px]" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="权重"><input type="number" step="0.1" value={edit.weight ?? 1} onChange={(e) => setEdit({ ...edit, weight: +e.target.value })} className="input" /></Field>
              <Field label="顺序"><input type="number" value={edit.display_order ?? 0} onChange={(e) => setEdit({ ...edit, display_order: +e.target.value })} className="input" /></Field>
              <Field label="启用"><label className="flex items-center h-9"><input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /></label></Field>
            </div>
            <button onClick={async () => {
              try { await upsert({ data: { ...edit, code: edit.code!, name: edit.name! } as never }); toast.success("已保存"); setEdit(null); refresh(); }
              catch (e) { toast.error((e as Error).message); }
            }} className="w-full border border-foreground bg-foreground py-2 text-sm text-background">保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Tags ----------------
function TagsPanel() {
  const list = useServerFn(listTags);
  const upsert = useServerFn(upsertTag);
  const merge = useServerFn(mergeTag);
  const [rows, setRows] = useState<KTag[]>([]);
  const [edit, setEdit] = useState<Partial<KTag> | null>(null);
  const [mergeFrom, setMergeFrom] = useState<KTag | null>(null);
  const [mergeTo, setMergeTo] = useState("");

  const refresh = () => list().then(setRows);
  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} 个标签</p>
        <button onClick={() => setEdit({ code: "", name_zh: "", weight: 5, active: true })}
          className="border border-foreground px-3 py-1.5 text-sm hover:bg-foreground hover:text-background">新增标签</button>
      </div>
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3 text-left">code</th><th className="p-3 text-left">中文</th><th className="p-3 text-left">English</th><th className="p-3">权重</th><th className="p-3">状态</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{t.code}</td>
                <td className="p-3">{t.name_zh}</td>
                <td className="p-3 text-muted-foreground">{t.name_en}</td>
                <td className="p-3 text-center">{t.weight}</td>
                <td className="p-3 text-center text-xs">{t.active ? (t.merged_into ? "已合并" : "活跃") : "停用"}</td>
                <td className="p-3 text-center">
                  <button onClick={() => setEdit(t)} className="text-xs underline mr-2">编辑</button>
                  <button onClick={() => { setMergeFrom(t); setMergeTo(""); }} className="text-xs underline mr-2">合并</button>
                  <button onClick={async () => { await upsert({ data: { ...t, active: !t.active } as never }); refresh(); }}
                    className="text-xs underline">{t.active ? "停用" : "启用"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)} title={edit.id ? "编辑标签" : "新增标签"}>
          <div className="space-y-3">
            <Field label="code"><input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} className="input" /></Field>
            <Field label="中文名"><input value={edit.name_zh ?? ""} onChange={(e) => setEdit({ ...edit, name_zh: e.target.value })} className="input" /></Field>
            <Field label="English"><input value={edit.name_en ?? ""} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} className="input" /></Field>
            <Field label="描述"><textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="input min-h-[60px]" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="权重 (0-20)"><input type="number" value={edit.weight ?? 5} onChange={(e) => setEdit({ ...edit, weight: +e.target.value })} className="input" /></Field>
              <Field label="启用"><label className="flex items-center h-9"><input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /></label></Field>
            </div>
            <button onClick={async () => {
              try { await upsert({ data: { ...edit, code: edit.code!, name_zh: edit.name_zh! } as never }); toast.success("已保存"); setEdit(null); refresh(); }
              catch (e) { toast.error((e as Error).message); }
            }} className="w-full border border-foreground bg-foreground py-2 text-sm text-background">保存</button>
          </div>
        </Modal>
      )}
      {mergeFrom && (
        <Modal onClose={() => setMergeFrom(null)} title={`合并：${mergeFrom.name_zh} → ？`}>
          <select value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} className="input">
            <option value="">选择目标标签</option>
            {rows.filter((t) => t.id !== mergeFrom.id && t.active && !t.merged_into).map((t) => (
              <option key={t.id} value={t.id}>{t.name_zh} ({t.code})</option>
            ))}
          </select>
          <button disabled={!mergeTo} onClick={async () => {
            try { await merge({ data: { source_id: mergeFrom.id, target_id: mergeTo } }); toast.success("已合并"); setMergeFrom(null); refresh(); }
            catch (e) { toast.error((e as Error).message); }
          }} className="mt-3 w-full border border-foreground bg-foreground py-2 text-sm text-background disabled:opacity-50">确认合并</button>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Cases ----------------
function CasesPanel() {
  const list = useServerFn(listAllCasesAdmin);

  const upsert = useServerFn(upsertCase);
  const del = useServerFn(deleteCase);
  const tagsFn = useServerFn(listTags);
  const principlesFn = useServerFn(listPrinciples);
  const [rows, setRows] = useState<KCase[]>([]);
  const [allTags, setAllTags] = useState<KTag[]>([]);
  const [allPrinciples, setAllPrinciples] = useState<Principle[]>([]);
  const [edit, setEdit] = useState<Partial<KCase> | null>(null);
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "controversial">("all");

  const refresh = () => list({ data: {} }).then(setRows);
  useEffect(() => { refresh(); tagsFn().then(setAllTags); principlesFn().then(setAllPrinciples); }, []);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.polarity === filter);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1 text-sm">
          {(["all", "positive", "negative", "controversial"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1 border ${filter === k ? "border-foreground bg-foreground text-background" : "border-border"}`}>
              {{ all: "全部", positive: "正向", negative: "负向", controversial: "争议" }[k]}
            </button>
          ))}
        </div>
        <button onClick={() => setEdit({ title: "", summary: "", polarity: "negative", status: "draft", tags: [], principles: [], featured: false })}
          className="border border-foreground px-3 py-1.5 text-sm hover:bg-foreground hover:text-background">新增案例</button>
      </div>
      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">{c.code}</span>
                  <span className={`px-2 py-0.5 border ${c.polarity === "positive" ? "border-emerald-500 text-emerald-700" : c.polarity === "negative" ? "border-destructive text-destructive" : "border-amber-500 text-amber-700"}`}>
                    {{ positive: "正向", negative: "负向", controversial: "争议" }[c.polarity]}
                  </span>
                  <span className="text-muted-foreground">{c.status}</span>
                  {c.featured && <span className="text-amber-600">★ 精选</span>}
                </div>
                <h3 className="mt-2 font-serif text-lg">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
                {c.tags.length > 0 && <p className="mt-2 text-xs text-muted-foreground">标签：{c.tags.join("、")}</p>}
                {c.principles.length > 0 && <p className="text-xs text-muted-foreground">原则：{c.principles.join("、")}</p>}
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <button onClick={() => setEdit(c)} className="underline">编辑</button>
                <button onClick={async () => { if (confirm("删除案例？")) { await del({ data: { id: c.id } }); refresh(); } }}
                  className="underline text-destructive">删除</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">暂无案例</p>}
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)} title={edit.id ? `编辑案例 ${edit.code ?? ""}` : "新增案例"}>
          <div className="space-y-3">
            <Field label="标题"><input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="input" /></Field>
            <Field label="摘要 (≤500)"><textarea value={edit.summary ?? ""} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} className="input min-h-[80px]" /></Field>
            <Field label="详细说明"><textarea value={edit.detail ?? ""} onChange={(e) => setEdit({ ...edit, detail: e.target.value })} className="input min-h-[120px]" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="性质">
                <select value={edit.polarity ?? "negative"} onChange={(e) => setEdit({ ...edit, polarity: e.target.value as never })} className="input">
                  <option value="positive">正向</option>
                  <option value="negative">负向</option>
                  <option value="controversial">争议</option>
                </select>
              </Field>
              <Field label="状态">
                <select value={edit.status ?? "draft"} onChange={(e) => setEdit({ ...edit, status: e.target.value as never })} className="input">
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="archived">归档</option>
                </select>
              </Field>
              <Field label="精选">
                <label className="flex items-center h-9"><input type="checkbox" checked={edit.featured ?? false} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} /></label>
              </Field>
            </div>
            <Field label="标签 (按 code 多选)">
              <div className="flex flex-wrap gap-2">
                {allTags.filter((t) => t.active).map((t) => {
                  const on = (edit.tags ?? []).includes(t.code);
                  return (
                    <button key={t.id} type="button"
                      onClick={() => setEdit({ ...edit, tags: on ? (edit.tags ?? []).filter((x) => x !== t.code) : [...(edit.tags ?? []), t.code] })}
                      className={`px-2 py-1 text-xs border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                      {t.name_zh}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="对应原则">
              <div className="flex flex-wrap gap-2">
                {allPrinciples.map((p) => {
                  const on = (edit.principles ?? []).includes(p.code);
                  return (
                    <button key={p.id} type="button"
                      onClick={() => setEdit({ ...edit, principles: on ? (edit.principles ?? []).filter((x) => x !== p.code) : [...(edit.principles ?? []), p.code] })}
                      className={`px-2 py-1 text-xs border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="来源链接"><input value={edit.source_url ?? ""} onChange={(e) => setEdit({ ...edit, source_url: e.target.value })} className="input" placeholder="https://" /></Field>
            <button onClick={async () => {
              try {
                await upsert({ data: {
                  id: edit.id, title: edit.title!, summary: edit.summary!, detail: edit.detail,
                  polarity: edit.polarity!, status: edit.status ?? "draft",
                  tags: edit.tags ?? [], principles: edit.principles ?? [],
                  source_url: edit.source_url || undefined, featured: !!edit.featured,
                } as never });
                toast.success("已保存"); setEdit(null); refresh();
              } catch (e) { toast.error((e as Error).message); }
            }} className="w-full border border-foreground bg-foreground py-2 text-sm text-background">保存</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-serif text-xl">{title}</h3><button onClick={onClose} className="text-sm text-muted-foreground">关闭</button></div>
        {children}
      </div>
    </div>
  );
}
