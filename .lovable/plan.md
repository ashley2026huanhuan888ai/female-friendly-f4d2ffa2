## 目标
将「全部对象」页面（`/objects`）的默认排序从「温度从高到低」改为「最近更新」。

## 改动范围
- **`src/routes/objects.index.tsx`**
  - 修改第 42 行 `useState<"temp" | "recent">("temp")` 为 `useState<"temp" | "recent">("recent")`。
  - 其他逻辑、筛选器、UI 文案均不改动。

## 不改动
- 不改动 `src/lib/api/platform.functions.ts` 中的 `getPublicObjects` 排序逻辑（该函数已支持 `recent` 参数）。
- 不改动页面上的下拉选项顺序或标签文案。
- 不改动任何其他页面或组件。