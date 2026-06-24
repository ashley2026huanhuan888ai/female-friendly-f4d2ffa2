## 目标
在每个对象卡片右上角温度计正下方（截图绿框处）增加「抵制」按钮，显示累计抵制次数；登录用户点击切换抵制/取消抵制（与关注按钮逻辑一致）。

## 数据
新建表 `public.object_boycotts`：
- `user_id uuid` → `auth.users`，`object_id uuid` → `public.objects`，`created_at timestamptz`
- 主键 `(user_id, object_id)` 保证一人一对象唯一
- RLS：任何人可 SELECT（用于聚合计数），登录用户只能 INSERT/DELETE 自己的行
- `GRANT SELECT TO anon, authenticated`；`GRANT INSERT, DELETE TO authenticated`；`GRANT ALL TO service_role`
- 索引 `(object_id)` 便于计数

不改动 objects 表，也不写触发器；计数实时 `count(*)` 即可。

## 服务端函数
新文件 `src/lib/api/boycotts.functions.ts`：
- `getBoycottStatus({ object_id })` → `{ count: number, mine: boolean }`
  - 用 server publishable client 取总数；`requireSupabaseAuth` 不强制，登录态由 `attachSupabaseAuth` 自动带上时再查 `mine`。为简洁起见拆成两段：始终查 count（匿名也可见），再用 `auth.uid()` 检测。最干净的方式是单独一个 `toggleBoycott` 需要登录，`getBoycottStatus` 不需要。
- `toggleBoycott({ object_id })`（`.middleware([requireSupabaseAuth])`）→ `{ count, mine }`：若已存在则 DELETE，否则 INSERT，再返回最新计数与状态。

## 前端
新建 `src/components/BoycottButton.tsx`（参考 `FollowButton.tsx`）：
- 初始 `useEffect` 拉取 `{ count, mine }`
- 未登录点击 → 弹出现有登录提示（复用 FollowButton 的弹层样式或共用文案）
- 已登录点击 → 调用 toggle，乐观更新 count 与 mine
- 视觉：紧凑按钮，文案 `抵制 · N` / `已抵制 · N`，已抵制态用 accent 描边突出

在 `src/components/ObjectCard.tsx`：
- 把右侧 `<Thermometer />` 包成一个 `flex-col items-end gap-2` 容器
- 温度计下方放 `<BoycottButton objectId={id} />`
- 该按钮放在 `<Link>` 内会导致点击穿透到卡片跳转 → 把 Thermometer 列移出外层 `<Link>`，外层 Link 仅包裹左侧文字区；右列保持独立，按钮可正常响应点击

## i18n
在 `src/lib/i18n.tsx` 新增键：
- `boycott.action` = "抵制"
- `boycott.active` = "已抵制"
- `boycott.loginTitle` / `boycott.loginBody`（复用 follow 文案也可）

## 不在范围
- 不影响积分系统、不发通知、不进入对象详情页的其它统计
- 不修改详情页（仅卡片按需）；如后续要在详情页也加，可复用同一组件