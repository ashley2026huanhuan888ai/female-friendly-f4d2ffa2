# 「我的」页面：收起资料 + 显示我观察的标签

## 后端 `src/lib/api/observation-center.functions.ts`

在 `getMyDashboard` 返回中新增 `my_tags`：
- 取当前用户全部 `status='approved'` 的 observations 的 `tags` 数组（不再限制 limit 20，单独再查一次只取 `tags` 字段，最多 500 条）。
- 在内存里聚合成 `{ tag, count }[]`，按 count 倒序，截断前 24 个。
- 加到返回对象：`my_tags: ...`。

## 前端 `src/routes/me.tsx`

### 1. ProfileEditor 收起
- 新增 `const [editing, setEditing] = useState(false)`。
- 折叠态：只显示「个人资料」标题、`profile.hint` 一行说明，以及一个 `修改个人资料` 按钮（描边样式，与现有保存按钮同体量）。
- 展开态：保持现有表单 + 「保存资料」按钮；保存成功后自动 `setEditing(false)`。再加一个「取消」文字按钮（旁边）。
- 文案 i18n：
  - zh `profile.edit`: "修改个人资料"
  - en `profile.edit`: "Edit profile"
  - zh `profile.cancel`: "取消"  /  en: "Cancel"

### 2. 我观察的标签云
- 在 `<ProfileEditor />` 之后插入一个新的卡片（同 `border border-border bg-card p-5`）。
- 标题：`me.myTags`（zh「我观察的标签」/ en「Tags I observe」）。
- 数据来源：`data.my_tags`（从父组件 `data` 通过 prop 传入，或直接在父中渲染避免 prop drilling — 选后者）。
- 渲染方式复用对象详情页移动端标签云的算法：按 count 的 0–1 比例切 4 档字号 `text-2xl/xl/base/sm`，每个 tag 后缀 `·count`。
- 空数据时显示 `me.noTags`（zh「还没有已通过的观察」/ en「No approved observations yet.」）。
- 点击单个标签跳转 `/topics?tag=<raw tag>`（用 `Link to="/topics" search={{ tag }}`，与 ObjectDetail 一致）。

## 不做

- 不改 RLS 或迁移。
- 不改观察列表/通知/关注 Tab。
- 桌面/移动端共用同一布局。
