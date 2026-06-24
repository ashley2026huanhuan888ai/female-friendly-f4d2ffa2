## 用户贡献积分系统（温度积分 Contribution Points）

与现有 `reputation`（信誉值，影响审核权限）解耦，新增独立的"贡献积分 / 温度分"体系，用于等级、排行榜、邀请激励。

### 一、数据库

新建 4 张表 + 扩展 `profiles`：

1. **`profiles` 扩展字段**
   - `contribution_points numeric default 0` — 总积分
   - `invite_code text unique` — 用户唯一邀请码（注册时自动生成）
   - `inviter_id uuid` — 直接邀请人（可空）
   - `level int default 1`、`level_title text` — 缓存等级

2. **`contribution_events`** — 积分流水（核心审计表）
   - `user_id, delta numeric, kind, reason, source_user_id, observation_id, temperature_event_id, metadata jsonb, created_at`
   - `kind` 枚举：`observation_temp`（观察提温）/ `invite_signup`（邀请注册）/ `referral_bonus`（下线返利）/ `admin_adjust`
   - 一对一关联 `temperature_event_id` 防重复发放

3. **`invite_relations`** — 多级邀请关系（闭包表，便于多级返利查询）
   - `ancestor_id, descendant_id, depth int`（depth=1 直接邀请，2 二级…）
   - 注册时自动展开插入（最多记录 N 级，建议 N=5）

4. **`contribution_levels`** — 等级配置表（可后台调整）
   - `level int pk, min_points numeric, title text, badge text`
   - 默认：L1 萌新 0 / L2 关注者 10 / L3 观察员 50 / L4 记录者 200 / L5 守望者 500 / L6 灯塔 1500 / L7 大姐大 5000

所有表 GRANT + RLS：用户读自己流水/关系；levels 公开读；只有 SECURITY DEFINER 函数写入。

### 二、积分规则（核心函数）

**`award_observation_points(temp_event_id)`** —— 由 `temperature_events` AFTER INSERT 触发：
- 仅当 `delta > 0` 且 `actor_id` 非空时发放
- 积分 = `delta / 10`（线性，保留 numeric 精度，如 25°→2.5分）
- 写 `contribution_events` + 累加 `profiles.contribution_points`
- 接着调用 `cascade_referral_bonus(user_id, gained_points)`

**`cascade_referral_bonus(user_id, gained)`** —— 多级持续返利：
- 查 `invite_relations` 找该用户的所有 ancestor（按 depth 1..N）
- 每级按递减系数返：`depth=1 → gained * 0.10`（即下线每10分=1分），`depth=2 → 0.03`，`depth=3 → 0.01`，更深忽略
- 每笔写入 `contribution_events`（kind=`referral_bonus`，source_user_id=下线）

**`handle_invite_signup(new_user, invite_code)`** —— 注册时调用（详见下方注册流程）：
- 解析 invite_code → inviter_id；写 `profiles.inviter_id`
- 展开 invite_relations（自身→所有上级，depth+1）
- 给直接 inviter +5 分（kind=`invite_signup`）

### 三、注册流程接入

1. 邀请码生成：`profiles` 新增触发器，插入时若 `invite_code` 为空则生成 6 位短码
2. 注册页 `/auth` 增加"邀请码"输入框（选填）
3. URL `/auth?ref=XXXX` 自动填入邀请码 + localStorage 暂存（处理 OAuth 跳转回来仍能读取）
4. 注册成功后调用 server fn `bindInviter({ code })` → 执行 `handle_invite_signup`
   - 限制：只能绑定一次；不能填自己/循环

### 四、前端 UI

1. **个人主页 `/profile`**
   - 顶部卡片：当前积分、等级徽章、距离下一级进度条
   - Tab：积分明细（contribution_events 分页，显示来源/原因/时间/+x分）
   - 我的邀请：邀请码 + 复制链接按钮、已邀请人数、各级下线数、邀请贡献累计积分
2. **排行榜 `/leaderboard`**
   - 全站总榜 / 本周榜（按 created_at 过滤求和）
   - Top 50 卡片：头像、显示名、等级、积分
3. **对象详情页**：用户名旁边显示等级徽章（小组件 `<UserBadge userId/>`）
4. **管理后台 `/admin/contribution`**
   - 查看任意用户积分明细；手动调整（kind=admin_adjust，写审计日志）
   - 等级配置编辑

### 五、迁移与回填

- 一次性回填：扫描历史 `temperature_events`，按规则补发 `observation_events`（包在迁移 DO 块里）
- 历史无邀请关系数据，invite_relations 为空即可

### 技术细节

- 全部点数用 `numeric(12,2)`，避免小数丢失
- 所有写入走 SECURITY DEFINER 函数，前端/普通用户无法直接 INSERT `contribution_events`
- 等级计算用 SQL view 或在 award 函数末尾 UPDATE `profiles.level`
- 邀请码：base32 (Crockford) 6 位，碰撞重试
- 防滥用：`contribution_events` 对 `(user_id, kind, temperature_event_id)` 唯一索引；`invite_relations` 对 `(ancestor, descendant)` 唯一

### 实施顺序

1. 迁移：建表 + 触发器 + 函数 + 历史回填
2. 注册流程：邀请码生成 + 绑定 server fn + `/auth` UI
3. 个人主页积分 Tab + 邀请卡片
4. 排行榜页 + 等级徽章组件
5. 管理后台积分管理
