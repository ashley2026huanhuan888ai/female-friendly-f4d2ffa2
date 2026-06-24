在 `src/components/ObjectComments.tsx` 的 `onSubmit` 中：
- 成功：保留 `toast.success(t("objectComments.submitted"))`，并调用 `reload()` 刷新列表。
- 失败：改为 `toast.error(message, { action: { label: t("common.retry"), onClick: () => onSubmit() } })`，让用户一键重试。

仅前端改动，无 i18n 新增（复用已有 `common.retry`、`objectComments.submitted`）。
