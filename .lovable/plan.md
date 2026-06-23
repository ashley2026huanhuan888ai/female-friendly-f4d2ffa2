把首页"三步说明"从按钮下方搬到大标题（"…变化的"）和正文段落（"这里不是打分…"）之间，并改成 3 个卡片一行横排。

## 改动 `src/routes/index.tsx`

1. 删除当前位于 CTA 按钮下方的 `<ol className="mt-8 …sm:grid-cols-3">…</ol>`。
2. 在 `</h1>` 之后、`<p className="mt-8 …home.hero.body">` 之前插入新区块：
   ```
   <div className="mt-8 grid gap-3 sm:grid-cols-3">
     [01,02,03].map → 卡片
   </div>
   ```
   每张卡片：`border border-border bg-card p-4`，顶部为 mono 小号编号（accent 色），下方为步骤文案（serif 或 sans，`text-sm leading-6 text-foreground`）。
3. 移动端 `grid-cols-1`，`sm:` 起 3 列横排；卡片高度对齐。

不改动 i18n、其它板块、数据接口。