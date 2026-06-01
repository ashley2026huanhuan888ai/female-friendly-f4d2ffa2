import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { searchArchive, ARCHIVE_CATEGORIES } from "@/lib/api/archive.functions";
import { FEMINIST_TAGS, OBJECT_TYPE_LABELS, bandOf } from "@/lib/temperature";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "案例档案库 · 女性体验温度" },
      { name: "description", content: "可检索、可研究的女性体验案例数据库。" },
    ],
  }),
  component: ArchivePage,
});

type Item = Awaited<ReturnType<typeof searchArchive>>["items"][number];

function ArchivePage() {
  const search = useServerFn(searchArchive);
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [tempRange, setTempRange] = useState<[number, number]>([20, 100]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  useEffect(() => {
    setLoading(true);
    search({
      data: {
        q: q || undefined,
        categories: categories.length ? categories : undefined,
        tags: tags.length ? tags : undefined,
        object_types: types.length ? types : undefined,
        evidence: (evidence.length ? evidence : undefined) as any,
        temp_min: tempRange[0],
        temp_max: tempRange[1],
        page,
        page_size: 20,
      },
    })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [q, categories, tags, types, evidence, tempRange, page]);

  useEffect(() => { setPage(1); }, [q, categories, tags, types, evidence, tempRange]);

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Archive</div>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">案例档案库</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            所有通过审核的观察均沉淀为可检索的长期案例资产。共 {total.toLocaleString()} 条案例。
          </p>
          <div className="mt-6 flex gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索案例编号、关键词、对象名…"
              className="flex-1 border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
            <Link
              to="/archive/evidence"
              className="border border-border px-4 py-2.5 text-sm hover:border-foreground"
            >
              证据库（A 级）→
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card/40">
        <div className="container-prose space-y-4 py-6 text-xs">
          <Row label="档案分类">
            {ARCHIVE_CATEGORIES.map((c) => (
              <Chip key={c} active={categories.includes(c)} onClick={() => toggle(categories, c, setCategories)}>{c}</Chip>
            ))}
          </Row>
          <Row label="对象类型">
            {Object.entries(OBJECT_TYPE_LABELS).map(([k, v]) => (
              <Chip key={k} active={types.includes(k)} onClick={() => toggle(types, k, setTypes)}>{v}</Chip>
            ))}
          </Row>
          <Row label="议题标签">
            {FEMINIST_TAGS.map((t) => (
              <Chip key={t} active={tags.includes(t)} onClick={() => toggle(tags, t, setTags)}>#{t}</Chip>
            ))}
          </Row>
          <Row label="证据等级">
            {(["A", "B", "C", "D"] as const).map((e) => (
              <Chip key={e} active={evidence.includes(e)} onClick={() => toggle(evidence, e, setEvidence)}>{e}</Chip>
            ))}
          </Row>
          <Row label={`温度区间 ${tempRange[0]}–${tempRange[1]}°C`}>
            <input type="range" min={20} max={100} value={tempRange[0]}
              onChange={(e) => setTempRange([Number(e.target.value), tempRange[1]])} className="w-40" />
            <input type="range" min={20} max={100} value={tempRange[1]}
              onChange={(e) => setTempRange([tempRange[0], Number(e.target.value)])} className="w-40" />
          </Row>
        </div>
      </section>

      <section className="py-10">
        <div className="container-prose">
          {loading && items.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">检索中…</p>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">无匹配案例。</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {items.map((it) => <CaseRow key={it.id} item={it} />)}
            </ul>
          )}

          {total > items.length && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="border border-border px-3 py-1.5 disabled:opacity-30">上一页</button>
              <span className="text-muted-foreground">第 {page} 页 / 约 {Math.ceil(total / 20)} 页</span>
              <button disabled={items.length < 20} onClick={() => setPage(page + 1)}
                className="border border-border px-3 py-1.5 disabled:opacity-30">下一页</button>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-2 min-w-[5.5rem] text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`border px-2 py-0.5 transition ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function CaseRow({ item }: { item: Item }) {
  const band = bandOf(item.object.temperature);
  return (
    <li className="py-5">
      <Link
        to="/archive/$caseCode"
        params={{ caseCode: item.case_code }}
        className="group block"
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="font-mono text-foreground">{item.case_code}</span>
          <span>·</span>
          <span>{item.archive_category}</span>
          <span>·</span>
          <span className="border border-border px-1.5">证据 {item.evidence_level}</span>
          <span>·</span>
          <span className="text-foreground">{item.object.name}</span>
          <span className="text-muted-foreground">（{OBJECT_TYPE_LABELS[item.object.type] ?? item.object.type}）</span>
          <span className="ml-auto" style={{ color: `var(--temp-${band.band === "comfort" ? "cool" : band.band === "minor" ? "neutral" : band.band === "notable" ? "warm" : band.band === "high" ? "hot" : "critical"})` }}>
            {item.object.temperature.toFixed(1)}°C
          </span>
        </div>
        <p className="mt-2 text-base leading-relaxed group-hover:text-accent">{item.summary || "（无摘要）"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.tags.slice(0, 6).map((t) => <span key={t} className="text-accent">#{t}</span>)}
          <span className="ml-auto">{new Date(item.created_at).toLocaleDateString("zh-CN")}</span>
        </div>
      </Link>
    </li>
  );
}
