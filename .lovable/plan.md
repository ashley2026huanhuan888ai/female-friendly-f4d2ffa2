## 目标
在对象列表卡片中显示争议标签（如 #女性工具化），点击跳转至按标签筛选的对象列表。

## 现状
- `ObjectCard` 已经实现 top_tags 渲染并 `Link to="/objects?tag=..."`，点击跳转已就绪。
- 但数据库中 `objects.top_tags` 字段为空，导致卡片不显示标签。

## 改动
在 `src/lib/api/platform.functions.ts` 的 `getPublicObjects.handler` 中，拿到 items 后批量查询这些对象的 approved observations.tags，按对象聚合出 top 3 标签 `[{tag, count}]`，再合并进每个 item 的 `top_tags`（覆盖空数组）。

逻辑：
1. `const ids = sortedItems.map(o => o.id)`
2. `supabaseAdmin.from('observations').select('object_id, tags').eq('status','approved').in('object_id', ids)`
3. 在内存中按 object_id → Map<tag,count>，取 count 降序前 3。
4. 返回 items 时 `top_tags: byObject.get(o.id) ?? []`。

不动前端 ObjectCard、路由、i18n。