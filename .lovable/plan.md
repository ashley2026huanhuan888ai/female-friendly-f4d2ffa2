新增「用户互相关注」功能。

## 数据库（迁移）
新建 `public.user_follows`：
- `follower_id uuid` → auth.users(id) on delete cascade
- `followee_id uuid` → auth.users(id) on delete cascade
- `created_at timestamptz default now()`
- 主键 `(follower_id, followee_id)`，CHECK `follower_id <> followee_id`
- GRANT SELECT/INSERT/DELETE 给 authenticated，ALL 给 service_role
- 启用 RLS：
  - SELECT：authenticated 可读所有行（用于显示是否互关、列表）
  - INSERT：`auth.uid() = follower_id`
  - DELETE：`auth.uid() = follower_id`

## 服务函数 `src/lib/api/follows.functions.ts`
全部 `requireSupabaseAuth`：
- `followUser({user_id})` — upsert 一行（忽略冲突），禁止关注自己
- `unfollowUser({user_id})` — delete
- `getFollowStatus({user_id})` → `{ following, followed_by, followers_count, following_count }`
- `listMyFollowing()` → 返回 `[{id, display_name, avatar_url}]`
- `listMyFollowers()` → 同上

## UI
1. 新建 `src/components/FollowButton.tsx`：传入 `userId`，挂载时拉取状态，点击切换关注/取消。互相关注时按钮文字显示「互相关注」(`follow.mutual`)；已关注「已关注」可点击取消；未关注「关注」。
2. `src/routes/messages.$peerId.tsx`：在对话顶部 peer 名旁渲染 `<FollowButton userId={peerId} />`。
3. `src/routes/me.tsx`：新增 tab `relations`（或在现有 tab 后追加「关注 / 粉丝」），展示 `listMyFollowing`/`listMyFollowers` 两个列表，每行有头像、昵称、跳转 `/messages/:id` 链接，以及 `FollowButton`。

## i18n（zh/en）
新增键：`follow.follow`「关注/Follow」、`follow.following`「已关注/Following」、`follow.mutual`「互相关注/Mutual」、`follow.unfollow`「取消关注/Unfollow」、`me.following`「关注」、`me.followers`「粉丝」、`follow.empty`「暂无/None yet」。

不修改现有私信、profile、通知逻辑。