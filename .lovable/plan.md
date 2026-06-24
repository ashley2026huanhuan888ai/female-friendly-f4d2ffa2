# 管理员删除单条观察

后端 `deleteObservation` server fn 已存在并校验 admin，无需新增。仅做前端接入。

## 改动 `src/routes/objects.$id.tsx`

1. `import { deleteObservation } from "@/lib/api/platform.functions"`，`useServerFn` 包装；从 `useAuth()` 取 `isAdmin`。
2. 在「所有已审核观察」列表（约 324 行 `<article>`）右上角元数据行内追加一个仅 `isAdmin` 时渲染的删除按钮（小号文字按钮 `border border-destructive/60 text-destructive`，文案 i18n `objectDetail.deleteObservation` / "删除" / "Delete"）。
3. 点击 → `confirm(t("objectDetail.deleteConfirm"))` → 调用 `deleteObservation({ data: { id: o.id } })` → 成功 `toast.success` 并刷新列表（沿用现有的 `loadObservations` 或本地 `setObs(prev => prev.filter)`）。
4. 失败：`toast.error(err.message)`。

## i18n

`src/lib/i18n.tsx` 新增 zh/en：
- `objectDetail.deleteObservation`: "删除" / "Delete"
- `objectDetail.deleteConfirm`: "确认删除该观察？此操作不可撤销。" / "Delete this observation? This cannot be undone."

## 不做

- 不改 RLS / 不新建迁移（admin 走 service-role 的 server fn）。
- 不改桌面端其它布局。
- 不在 admin 后台页面重复加入口（已有审核流程；此处只是详情页便捷删除）。
