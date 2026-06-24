## 一、个人资料

**迁移**：`profiles` 新增 `bio text`、`avatar_url text`（`display_name` 已存在）。新增 RLS `SELECT` 策略：`TO authenticated USING (true)`（敏感字段 `email/reputation/auto_approve` 通过应用层只在自己资料里返回；`prevent_profile_escalation` 触发器已阻止越权写入）。

**服务函数** `src/lib/api/profile.functions.ts`：
- `getMyProfile`（含 email / reputation）
- `updateMyProfile({ display_name, bio, avatar_url })`，仅写这三列
- `getPublicProfile(user_id)`，只返回 `id, display_name, bio, avatar_url`

**UI**：`/me` 顶部加"个人资料"卡片（昵称 / 简介 / 头像 URL 输入 + 保存按钮 + 成功/失败 toast）。

## 二、私信系统

**迁移**：新建 `public.direct_messages`
```
id uuid pk, sender_id uuid → auth.users, recipient_id uuid → auth.users,
body text not null check (length(body) between 1 and 2000),
created_at timestamptz default now(), read_at timestamptz
```
索引 `(sender_id, recipient_id, created_at desc)` 和 `(recipient_id, read_at)`。RLS：
- SELECT：`auth.uid() in (sender_id, recipient_id)`
- INSERT：`sender_id = auth.uid() and recipient_id <> auth.uid()`
- UPDATE：仅收件人能把自己的消息置 `read_at`
GRANT `SELECT, INSERT, UPDATE` 给 `authenticated`，`ALL` 给 `service_role`。

**服务函数** `src/lib/api/messages.functions.ts`：
- `listConversations()` — 聚合每个对话对方的最近一条消息 + 未读数 + 对方昵称
- `listMessages({ peer_id, limit, before })`
- `sendMessage({ recipient_id, body })`
- `markConversationRead({ peer_id })`

**路由**（均放在 `src/routes/_authenticated/` 下）：
- `messages.tsx`：对话列表
- `messages.$peerId.tsx`：消息时间线 + 输入框，进入即标已读
全部使用 sonner 显示成功 / 失败重试 toast。

**入口**：
- 顶部导航新增"私信"，带未读小红点（从 `listConversations` 汇总）
- `ObjectComments` 中暴露评论作者 `user_id`，已登录且非本人时在评论行加"私信 ta"按钮 → 跳 `/messages/$peerId`

## 三、i18n
新增 `profile.*` 与 `messages.*` 中英文 key（标题、占位符、空状态、成功 / 错误 / 重试、未读等）。

无 edge function 改动。
