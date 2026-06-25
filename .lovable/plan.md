## 抵制榜单（对象榜 + 用户榜）

在 `/leaderboard` 页面增加"抵制"维度，与现有"贡献"并列。

### 后端：`src/lib/api/boycotts.functions.ts` 新增两个公共 server fn

- `getObjectBoycottLeaderboard({ limit })` —— 按对象的 `object_boycotts` 数量聚合 Top N，返回 `{ object_id, name, slug, type, avatar, count }`。
- `getUserBoycottLeaderboard({ limit })` —— 按 `user_id` 聚合，join `profiles` 返回 `{ id, display_name, avatar_url, count }`。

两者用 publishable client（RLS：`object_boycotts` 已有 `anyone can read`，`profiles` 公开字段已可读）。聚合方式：`select object_id` / `select user_id` 全量拉取后在内存计数（数据量小），或用 `rpc` 方便起见先走内存计数。

### 前端：`src/routes/leaderboard.tsx`

- 顶部增加"维度"切换：`贡献` / `对象抵制` / `用户抵制`。
- 贡献维度沿用现 range（总/月/周）。抵制维度暂不分时间段（表无 `created_at` 维度区分，保持简单）。
- 三种维度复用同一 `<ol>` 列表样式：
  - 对象榜：左侧序号 + 对象封面/占位 + 名称（链接到 `/objects/$id`）+ 类型小字 + 右侧抵制数。
  - 用户榜：与现有用户榜一致，右侧数字为抵制对象数。

### 技术细节

- 不动数据库结构，不加新表。
- 对象榜需要的对象元信息从 `objects` 表（`id,name,slug,type,cover_url` 等已有列）二次查询，按抵制数排序后取详情。
- 不引入新依赖。
