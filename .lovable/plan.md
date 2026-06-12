# 注册流程检验与改进

## 现状（src/routes/login.tsx + Supabase Auth）

1. 用户填邮箱+密码（≥8位）→ `supabase.auth.signUp` (带 `emailRedirectTo`)
2. 触发 `handle_new_user` → 自动写入 `profiles` + `user_roles(role='user')`
3. 用户收邮件点验证链接 → 跳回 `safeRedirect`（默认 `/`）
4. 切回登录页用密码登录 → `signInWithPassword` → 跳转

## 发现的问题

1. **缺少 `/reset-password` 路由** — 登录页文案说"如忘记密码请重置"，但项目里没有忘记密码入口，也没有 reset-password 页面。一旦发送恢复邮件，链接打开会自动登录但无法改密码。
2. **缺少邮箱验证回跳页** — `emailRedirectTo` 指向 `/`，未给用户任何"验证成功"反馈，体验差。
3. **未启用 HIBP 泄露密码检测** — 当前未开启 `password_hibp_enabled`，弱口令/已泄露密码可注册。
4. **未配置 Google 登录** — Lovable Cloud 默认推荐邮箱+Google，目前只有邮箱。
5. **注册成功后未自动切回登录模式** — 用户看到 toast 后仍停留在"注册"表单。
6. **`signUp` 未检测"已注册但未验证"重复注册** — Supabase 在 `Confirm email` 开启时对重复注册返回成功但不发邮件，用户会误以为收件箱有问题。建议提示"如未收到邮件，可尝试登录并重发验证邮件"。

## 计划改动

### A. 新增 `/reset-password` 路由
- 公开路由 `src/routes/reset-password.tsx`
- 检测 URL hash 中的 `type=recovery`；渲染"设置新密码"表单
- 调用 `supabase.auth.updateUser({ password })`；成功后跳登录

### B. 在登录页加"忘记密码"
- signin 模式下显示"忘记密码？"链接
- 点击调用 `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`

### C. 注册体验微调
- 注册成功后自动 `setMode('signin')` 并清空密码字段
- 错误文案补充：`signUp` 返回 `data.user` 但 `identities=[]` 时提示"该邮箱可能已注册，请直接登录或重发验证邮件"

### D. 安全加固
- 调用 `supabase--configure_auth` 开启 `password_hibp_enabled: true`，保持 `auto_confirm_email: false`、`disable_signup: false`、`external_anonymous_users_enabled: false`

### E.（可选，需确认）Google 登录
- 默认建议开启；如不需要可跳过。我会在 build 阶段先问一次。

## 不改动

- `src/integrations/supabase/client.ts`、`auth-middleware.ts`、`types.ts`（自动生成）
- `handle_new_user` 触发器（已正确）
- 现有"保持登录 30 天"逻辑
