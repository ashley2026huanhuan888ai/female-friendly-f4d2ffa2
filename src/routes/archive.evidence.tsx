import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { getEvidenceLibrary } from "@/lib/api/archive.functions";
import { OBJECT_TYPE_LABELS } from "@/lib/temperature";

export const Route = createFileRoute("/archive/evidence")({
  head: () => ({ meta: [{ title: "证据库（A 级） · 女性友好体验测评" }] }),
  component: EvidenceLib,
});

function EvidenceLib() {
  const fetcher = useServerFn(getEvidenceLibrary);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetcher({ data: { page, page_size: 20 } }).then((r) => { setItems(r.items); setTotal(r.total); });
  }, [page]);

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Evidence Library · A 级</div>
          <h1 className="mt-3 font-serif text-4xl">证据库</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            仅收录附原始截图、广告原文、台词、采访原文、公开资料引用的 A 级证据案例。共 {total.toLocaleString()} 条。
          </p>
          <Link to="/archive" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">← 返回全部案例</Link>
        </div>
      </section>

      <section className="py-10">
        <div className="container-prose">
          {items.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">暂无 A 级证据案例。</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {items.map((it) => (
                <li key={it.id} className="py-5">
                  <Link to="/archive/$caseCode" params={{ caseCode: it.case_code }} className="group block">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span className="font-mono text-foreground">{it.case_code}</span>
                      <span>·</span>
                      <span className="border border-accent px-1.5 text-accent">证据 A</span>
                      <span>·</span>
                      <span>{it.archive_category}</span>
                      <span>·</span>
                      <span className="text-foreground">{it.object.name}</span>
                      <span>（{OBJECT_TYPE_LABELS[it.object.type] ?? it.object.type}）</span>
                      <span className="ml-auto">{new Date(it.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                    <p className="mt-2 text-base leading-relaxed group-hover:text-accent">{it.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {it.tags.slice(0, 6).map((t: string) => <span key={t} className="text-accent">#{t}</span>)}
                      {it.reference_url && <span className="ml-auto">📎 参考链接</span>}
                      {it.screenshot_url && <span>🖼 截图</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {total > items.length && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="border border-border px-3 py-1.5 disabled:opacity-30">上一页</button>
              <span className="text-muted-foreground">第 {page} 页</span>
              <button disabled={items.length < 20} onClick={() => setPage(page + 1)}
                className="border border-border px-3 py-1.5 disabled:opacity-30">下一页</button>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
