# 登录页改进

## 1. 登录框上方加提示
在 `<h1>` 与表单之间插入一段说明（替换/补充现有的 `login.description`）：

> 登录后可以提交观察、跟踪审核状态、保存关注对象。你的邮箱和身份不会公开展示。

新增 i18n key `login.intro`（中英双语），用 `text-sm text-muted-foreground` 样式。

## 2. 邮箱 OTP（魔法链接 / 验证码）
新增一种「无密码登录」模式，与现有密码登录并存：

- 顶部加切换 tab：**密码登录** / **邮箱验证码**
- 验证码模式下表单只有 `邮箱` 字段 → 按钮「发送验证码」
- 调用 `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: true } })`
  - 同时支持点击邮件里的魔法链接登录、或粘贴 6 位验证码
- 发送成功后切换到「输入验证码」步骤：显示一个 6 位数字输入框 + 「确认登录」按钮
  - 调用 `supabase.auth.verifyOtp({ email, token, type: "email" })`
  - 提供「重新发送」（60s 倒计时）
- 错误用同一个 `errorDetail` 框展示；对 `otp_expired`、`invalid_otp` 增加文案
- 新增 i18n keys：`login.tab.password` / `login.tab.otp` / `login.otp.send` / `login.otp.sent` / `login.otp.codeLabel` / `login.otp.verify` / `login.otp.resendIn` / `login.otp.resend` / `login.error.otpExpired.*` / `login.error.invalidOtp.*`

注册（signup）时也提示「不想设密码？切换到邮箱验证码即可」。

## 3. 不改动
- 现有密码登录/注册/忘记密码流程
- Supabase auth 配置（OTP 默认已启用，无需 `configure_auth`）
- 邮件模板（沿用默认 Lovable 模板；如需品牌化再单独处理）

## 文件
- `src/routes/login.tsx` —— 新增 tab、OTP 表单、verifyOtp、倒计时、intro 文案
- `src/lib/i18n.tsx` —— 新增上述 keys（中英）

预计 ~120 行新增。
