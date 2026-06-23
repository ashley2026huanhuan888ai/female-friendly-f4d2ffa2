## 目标
"最新性别争议热度"列表，每个对象在中部增加最多 2 个最热标签（来自该对象近 7 天 approved 观察的 tags 频次 top 2），可点击跳转 `/objects?tag=...`。

## 改动
1. `src/lib/api/observation-center.functions.ts` — `pack()` 返回新增字段 `top_tags: string[]`，取 `agg.tags` 频次降序前 2。
2. `src/routes/index.tsx` — `ColumnList` 每项的 `<div className="truncate font-serif">{o.name}</div>` 之下，名称与 detail 之间渲染 `top_tags` 小标签行：
   - 使用 `Link to="/objects" search={{ tag }}`、`#{tagLabel(tag)}` 样式与 `ObjectCard` 标签一致（边框、`text-[11px]`）。
   - `onClick` 阻止冒泡，避免触发父级跳转。
   - 没有标签时不渲染该行。

不动后端聚合粒度（仍是 7 天窗口）、不动样式 token。