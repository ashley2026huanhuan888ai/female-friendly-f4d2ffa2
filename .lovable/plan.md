## 改动

在 `src/routes/objects.$id.tsx` 中，将"Tags ·"区域（移动端词云 + 桌面端标签）里每个 tag 由 `<span>` 改为 `<Link to="/objects" search={{ tag: tt.tag }}>`，并保留现有样式，添加 hover 态（如 `hover:text-accent`）。

跳转目标 `/objects?tag=xxx` 已存在并支持按标签筛选对象列表，无需新增路由或后端改动。

涉及位置：
- 移动端词云：第 240-245 行的 `<span>`
- 桌面端标签：第 278-282 行的 `<span>`