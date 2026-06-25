## 目标

用户点击"抵制"按钮成功添加抵制后（非取消抵制），弹出一个庆祝对话框，显示这是 TA 的第 N 次抵制。

## 变更

### 1. `src/lib/api/boycotts.functions.ts`

新增 `getMyBoycottCount` server function（带 `requireSupabaseAuth`）：返回当前用户在 `object_boycotts` 表中的总记录数。

### 2. `src/components/BoycottButton.tsx`

- 增加 state：`celebrate: { open: boolean; n: number }`
- `onClick` 中，当 `toggle` 返回 `mine === true`（即新增抵制，非取消）时，调用 `getMyBoycottCount` 获取最新总数 N，打开庆祝弹窗。取消抵制时不弹。
- 新增庆祝对话框 UI（与现有 `showPrompt` 同风格：`fixed inset-0` 遮罩 + `paper` 卡片 + 衬线大标题 + 芭比粉 `accent` 强调）。  
`N次和用户抵制的次数相等`



### 文案设计

- 小标签（uppercase tracking）：`第 N 次抵制`
- 主标题（font-serif text-2xl）：`恭喜你，守住了边界。`
- 正文（text-sm muted）：
  > 我，不忍受冒犯。  
  > 这是我的第 **N** 次抵制——每一次都在告诉世界：  
  > 我会守住我的边界。
- N 用 `text-accent`（芭比粉）+ `font-serif` 放大强调。
- 关闭按钮：`知道了`（`bg-foreground text-background`，hover 变 accent）+ 次按钮 `去贡献榜看看`（链到 `/leaderboard`）。
- 首次（N === 1）替换正文首句为：`你的第一次抵制，从今天起算。`
- 不改动

- 不修改"取消抵制"行为，不弹窗。
- 不动 `BoycottButton` 之外的调用方。