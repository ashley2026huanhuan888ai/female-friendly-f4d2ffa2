## 目标
在首页"最新 AI 观察"卡片列表请求失败时，错误提示旁显示"重试加载"按钮；点击后重新拉取数据，期间状态切回 loading（自动隐藏错误提示），成功后展示列表。

## 改动

1. **`src/routes/index.tsx`**
   - 将 `useEffect` 内的拉取逻辑抽成 `loadSummary` 函数（`useCallback` 包裹，依赖 `fetchSummary`），`useEffect` 调用它一次。
   - 错误分支由单个 `<p>` 改为容器，包含错误文案 + `<button>`，按钮 `onClick={loadSummary}`，文案使用新 i18n key `common.retry`。

2. **`src/lib/i18n.tsx`**
   - 新增 `common.retry`：中文 "重试加载"，英文 "Retry"。

无后端变更。
