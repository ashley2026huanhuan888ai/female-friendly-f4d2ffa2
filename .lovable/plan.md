## 目标
未注册用户在首页能看到「最新更新的 5 条测评对象」。

## 现状
首页 `/`（`src/routes/index.tsx`）已经有"新加入测评对象"区块，向所有访客（含未登录）展示，数据来自公共 server fn `getHomeSummary`（`supabaseAdmin` 读取，不需要登录）。当前限制是 8 条。

## 改动

### `src/lib/api/observation-center.functions.ts`
- `newestObjs` 查询的 `.limit(8)` 改为 `.limit(5)`。

### `src/routes/index.tsx`
- 区块标题从「新加入测评对象」改为「最新更新的测评对象」，更贴合"更新"语义。
- 其他逻辑不变（仍按 `created_at desc`，未登录可见）。

## 不改动
- 不新增表/字段/RLS。
- 其他首页区块、其它页面不动。
