# 批量通过按钮强化

适用于 `src/routes/admin.observations.tsx` 和 `src/routes/admin.requests.tsx`（两个管理列表用同一交互模式）。

## 行为

「批量通过」按钮单击：
- 若当前没有任何选中 → 自动全选（等同 `toggleAll` 选全），不执行操作
- 若已经全选或部分选中 → 执行 `runBatch("approve")`

## 样式

按钮尺寸增大 1 倍：
- padding 从 `px-3 py-1` → `px-6 py-3`
- 字号显式 `text-base font-semibold`
- 保持芭比粉主题：`border-accent bg-accent text-accent-foreground hover:bg-accent/90`（替换原 `bg-foreground`）

## 实现

新增 handler：
```ts
const onBulkApprove = () => {
  if (selected.size === 0) {
    setSelected(new Set(items.map((i) => i.id)));
    return;
  }
  void runBatch("approve");
};
```
按钮 `disabled` 条件移除 `selected.size === 0`，只保留 `batchBusy`。
不动「批量驳回」、全选 checkbox、其它筛选 UI。
