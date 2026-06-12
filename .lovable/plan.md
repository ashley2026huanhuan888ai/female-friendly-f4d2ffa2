## 目标
管理员在 `/admin/analytics`（数据页）能看到全部注册用户列表，而不只是 Top 5 高信誉。

## 改动

### 1. `src/lib/api/platform.functions.ts`
- 在 `getAdminAnalytics` 返回值中增加 `users_total`（profiles 总数，`count: "exact", head: true`）。
- 新增 server fn `listAllUsers`（`requireSupabaseAuth` + `assertAdmin`），按 `created_at desc` 返回 profiles 全量字段：`id, email, display_name, reputation, auto_approve, created_at`，支持可选 `limit/offset`（默认 limit 200）和可选 `q`（按 email/display_name 模糊匹配）。

### 2. `src/routes/admin.analytics.tsx`
- 概览卡新增「注册用户总数」（来自 `users_total`）。
- 在页面底部新增「全部注册用户」区块：
  - 顶部一个搜索框（按邮箱/昵称过滤）。
  - 表格列：用户（昵称/邮箱）、信誉、等级、自动通过、注册时间。
  - 调用新的 `listAllUsers`，默认 200 条；超出时显示「仅显示最近 200 位，前往 用户信誉 页查看更多」并链到 `/admin/users`。

### 不改动
- `admin/users` 页（已有的信誉管理功能保持原样，分工清晰：数据页只读概览，用户页负责调整）。
- RLS / 表结构 / 其他模块。

## 备注
数据完全通过已有的 `supabaseAdmin`（service role）读取，不需要新增 RLS 策略；server fn 内已 `assertAdmin` 鉴权。