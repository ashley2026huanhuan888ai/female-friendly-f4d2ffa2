---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 92af3035b32c7e7950c25123ade5c4b0_1b2687a1723711f1986d525400d9a7a1
    ReservedCode1: YK81HavOvfsmAM//t2lObKjP0xIOnUS0D09f81cFJDuzsg99BF14B+bUENqysI2sYAK6rbXrz7bXKcGi/Gk/VT92KnyVK886OgJxOek5hAbJlGALvRzb0MSi778ZZF17Qjx8pnICPo9SmoLtPr6UyQPJ9S1x6B5NF9Rxlva7L+M/7m8GUoVnh8+86gM=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 92af3035b32c7e7950c25123ade5c4b0_1b2687a1723711f1986d525400d9a7a1
    ReservedCode2: YK81HavOvfsmAM//t2lObKjP0xIOnUS0D09f81cFJDuzsg99BF14B+bUENqysI2sYAK6rbXrz7bXKcGi/Gk/VT92KnyVK886OgJxOek5hAbJlGALvRzb0MSi778ZZF17Qjx8pnICPo9SmoLtPr6UyQPJ9S1x6B5NF9Rxlva7L+M/7m8GUoVnh8+86gM=
---

# 积分系统与信誉分数系统设计逻辑分析

> 项目：Female Friendly（女性友好体验测评平台）
> 分析日期：2026-06-27
> 分析方法：源码级逆向工程 + 逻辑推演

---

## 一、系统概览

本项目包含两个**独立但并行触发**的用户评价体系：

| 维度 | 积分系统 (Contribution) | 信誉系统 (Reputation) |
|---|---|---|
| **核心定位** | 用户贡献的**价值度量**（"你创造了多少价值"） | 用户行为的**质量把关**（"你的行为是否合规"） |
| **数值范围** | 浮点数，从 0 累加，无上限 | 整数，从 0（或 50 初始值）起，可正可负 |
| **变动触发** | 观察提温、邀请注册、下线返利、管理员调整 | 观察审核（通过/驳回）、管理员调整 |
| **等级体系** | `contribution_levels` 表驱动（level / min_points / title / badge） | 硬编码 4 级（new_user / trusted_user / contributor / research_contributor） |
| **事件记录表** | `contribution_events` | `reputation_events` |
| **用户表字段** | `profiles.contribution_points` | `profiles.reputation` |

---

## 二、积分系统设计

### 2.1 积分获取规则

积分获取有四种 `kind`，定义在 `contribution_kind` 枚举中：

| 序号 | 类型 | kind | 积分规则 | 触发时机 |
|---|---|---|---|---|
| 1 | 观察提温 | `observation_temp` | **温度增量 ΔT / 10**（即对象每升温 10°C = 1 分） | 提交的观察被采纳且引发对象温度上升 |
| 2 | 邀请注册 | `invite_signup` | **固定 +5 分/人** | 新用户通过你的邀请码/链接完成注册 |
| 3 | 下线返利 | `referral_bonus` | **L1: +10%，L2: +3%，L3: +1%**（多级分润，无限深度） | 你的下线（含间接下线）获得积分时自动结算 |
| 4 | 管理员调整 | `admin_adjust` | **任意整数**（正值加分，负值扣分） | 管理员在后台手动调整 |

#### 2.1.1 观察提温详解

这是最核心的积分来源。完整链路为：

```
用户提交观察 → AI 分析 → 自动通过/管理员审核 → 观察状态变为 approved
→ 触发温度重算 (recomputeObjectWithEngine)
→ 温度引擎 runEngine() 计算出对象的新温度
→ 如果温度增量 delta > 0
→ 调用 add_contribution(_kind="observation_temp", _delta=delta)
→ 用户获得 delta 分（实际是 delta/10 的逻辑，见下方说明）
→ 同时触发 cascade_referral_bonus() 向上级分润
```

**关键细节**：
- 前端展示"每 10°C = 1 分"，即温度增量与积分的换算比为 10:1。
- 温度增量是**对象维度**的（该对象因所有观察的累积效应），而非单条观察独立计算。这意味着一条观察的积分贡献取决于它与其他观察的协同效应。
- 如果观察被拒绝，不产生积分。

#### 2.1.2 邀请与返利机制

采用**闭包表（Closure Table）**模式实现多级关系：

- `invite_relations` 表存储 `(ancestor_id, descendant_id, depth)` 三元组
- `depth=1` 表示直接邀请，`depth=2` 为二级下线，`depth=3` 为三级下线
- 返利通过 `cascade_referral_bonus` RPC 函数实现，在用户获得积分后自动向上追溯

前端展示的三级比例（L1 +10%、L2 +3%、L3 +1%）意味着：
- 你的直接好友（L1）每获得 10 分，你获得 1 分
- 你邀请的好友再邀请的人（L2）每获得约 33 分，你获得 1 分
- L3 每获得 100 分，你获得 1 分

### 2.2 积分等级体系

等级由 `contribution_levels` 数据库表动态定义（非硬编码），字段结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `level` | integer | 等级序号 |
| `min_points` | number | 最低积分门槛 |
| `title` | string | 等级名称（如"萌新"） |
| `badge` | string | 等级徽章（emoji/图标） |

前端 `contribution.tsx` 中通过查询所有等级并倒序查找当前等级：
```typescript
const cur = [...levels].reverse().find((l) => Number(l.min_points) <= points) ?? levels[0];
const next = levels.find((l) => Number(l.min_points) > points);
```
同时计算升级进度条百分比。

### 2.3 排行榜机制

`getLeaderboard` 函数支持三种时间维度：

| 范围 | 逻辑 |
|---|---|
| `all` | 直接从 `profiles` 表按 `contribution_points DESC` 排序 |
| `week` | 近 7 天 `contribution_events` 聚合 `delta` 求和后排序 |
| `month` | 近 30 天同理聚合 |

周榜/月榜只统计积分**增量**，而非累积总量，体现"近期活跃度"。

---

## 三、信誉分数系统设计

### 3.1 信誉等级

硬编码四级（`src/lib/reputation.ts`）：

| 等级 | key | 中文名 | 最低分数 |
|---|---|---|---|
| 0 | `new_user` | 新用户 | 0 |
| 1 | `trusted_user` | 可信用户 | 80 |
| 2 | `contributor` | 贡献者 | 150 |
| 3 | `research_contributor` | 研究贡献者 | 300 |

等级判定逻辑：倒序遍历等级数组，取第一个 `rep >= min` 的等级。

### 3.2 信誉分数变动规则

信誉分数的变动**仅在观察审核时触发**（通过 `reviewObservation` 函数）：

#### 3.2.1 通过（Approve）

| 场景 | delta |
|---|---|
| 通过（无参考链接） | **+5** |
| 通过（有参考链接 reference_url） | **+10** |

#### 3.2.2 驳回（Reject）

| 驳回原因 | value | delta |
|---|---|---|
| 内容过短 | `too_short` | **-10** |
| 缺少观察事实 | `no_facts` | **-10** |
| 纯情绪表达 | `pure_emotion` | **-10** |
| 重复内容 | `duplicate` | **-10** |
| 广告内容 | `advertisement` | **-20** |
| 人身攻击 | `personal_attack` | **-30** |
| 涉嫌造谣 | `defamation` | **-30** |
| 无关内容 | `off_topic` | **-10** |

### 3.3 自动通过与信誉联动

在 `submitObservation` 中：
- 检查用户 `profiles.auto_approve` 标志
- 若 `auto_approve === true` 且 AI 风险判定为 `low`、无重复、证据等级非 D → 自动通过
- 自动通过时同步调用 `apply_reputation_delta`（+5 或 +10）
- 若为法律强证据（命中监管关键词），无论 AI 结果如何均强制通过

### 3.4 信誉事件记录

`reputation_events` 表结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `user_id` | uuid | 用户 ID |
| `delta` | integer | 变动值 |
| `reason` | string | 变动原因 |
| `observation_id` | uuid/null | 关联的观察 ID |
| `created_at` | timestamptz | 创建时间 |

---

## 四、积分与信誉的联动关系

### 4.1 共同触发点

两个系统在**观察审核完成时**同时触发：

```
reviewObservation / submitObservation
├── 更新 observations.status
├── apply_reputation_delta()  → 信誉分数变动
├── recomputeObjectInternal() → 温度重算
│   └── add_contribution()    → 积分变动（observation_temp）
│       └── cascade_referral_bonus() → 下线返利积分
```

### 4.2 独立性与差异

| 对比维度 | 积分 | 信誉 |
|---|---|---|
| 变动方向 | 几乎只增不减（除非管理员扣分） | 可升可降（驳回扣分） |
| 邀请奖励 | 有（+5 注册 + 多级返利） | 无 |
| 计算精度 | 浮点数 | 整数 |
| 与温度的关系 | 直接挂钩（ΔT/10） | 与温度无关 |
| 用户可见性 | 首页积分卡片 + 排行榜 | 个人资料页（推测） |

### 4.3 潜在协同效应

- **高信誉 → 自动通过**：信誉不直接决定 `auto_approve`，但 `auto_approve` 是管理员手动授予的标志。实际上该字段可能基于信誉阈值由管理员设置。
- **高信誉 → 更多积分**：高信誉用户更可能获得自动通过，意味着提交的观察更快被采纳，从而更快获得积分。但这不是系统直接强制的关系。
- **无直接兑换/消耗机制**：两个分数体系均只有累积逻辑，没有"消耗信誉换取积分"或"积分兑换信誉"的兑换桥梁。

---

## 五、数据库表结构（相关字段）

### 5.1 `profiles` 表（用户）

```sql
contribution_points  NUMERIC     -- 积分总额（浮点）
reputation           INTEGER     -- 信誉分数
level                INTEGER     -- 积分等级序号
level_title          TEXT        -- 积分等级名称
invite_code          TEXT        -- 邀请码
inviter_id           UUID        -- 邀请人 ID
auto_approve         BOOLEAN     -- 是否自动通过观察
```

### 5.2 `contribution_events` 表

```sql
id                  UUID
user_id             UUID          -- 获得积分的用户
delta               NUMERIC       -- 变动值
kind                ENUM('observation_temp','invite_signup','referral_bonus','admin_adjust')
reason              TEXT          -- 原因描述
source_user_id      UUID          -- 来源用户（返利时指下线）
observation_id      UUID          -- 关联观察
depth               INTEGER       -- 返利层级（1/2/3）
temperature_event_id UUID         -- 关联温度事件
metadata            JSONB         -- 元数据
created_at          TIMESTAMPTZ
```

### 5.3 `contribution_levels` 表

```sql
level       INTEGER     -- 等级序号
min_points  NUMERIC     -- 最低积分
title       TEXT        -- 等级标题
badge       TEXT        -- 徽章字符
```

### 5.4 `reputation_events` 表

```sql
id              UUID
user_id         UUID
delta           INTEGER
reason          TEXT
observation_id  UUID
created_at      TIMESTAMPTZ
```

### 5.5 `invite_relations` 表（闭包表）

```sql
ancestor_id    UUID    -- 上级用户
descendant_id  UUID    -- 下级用户
depth          INTEGER -- 层级深度（1=直接，2=隔代，3=曾孙）
created_at     TIMESTAMPTZ
```

### 5.6 `observations` 表（相关字段）

```sql
user_id         UUID      -- 提交者
object_id       UUID      -- 评测对象
status          ENUM('pending','approved','rejected','draft','archived')
evidence_level  ENUM('A','B','C','D')
tags            JSONB     -- 标签数组
confidence      NUMERIC   -- AI 置信度
impact_score    NUMERIC   -- 影响分数
reference_url   TEXT      -- 参考链接（影响信誉 delta）
```

---

## 六、测评分析

### 6.1 优点（设计亮点）

#### 1. 分离关注点：价值 vs 质量

积分和信誉各司其职——积分衡量"产出价值"，信誉衡量"行为合规"。这种设计避免了单一分数既要反映贡献量又要反映可信度的矛盾，比 Stack Overflow 的单一 reputation 分数更精细。

#### 2. 多级邀请返利 + 闭包表

采用 `invite_relations` 闭包表实现三级返利（10% / 3% / 1%），而非简单的单级邀请奖励。闭包表模式使得任意深度的追溯查询都是 O(1) 查找，避免了递归 CTE 的性能问题。这是成熟的社交裂变设计。

#### 3. 信誉惩罚的梯度设计

驳回原因的 delta 分为三档（-10 / -20 / -30），按违规严重程度递增。"人身攻击"和"造谣"最重（-30），"内容过短"等较轻（-10），体现了合理的惩戒梯度。

#### 4. 温度-积分线性挂钩

"对象升温 10°C = 1 分"的公式简洁透明，用户容易理解。同时积分随温度增量线性增长，高质量观察（高 evidence_level + 高 weight 标签 → 更多升温）自然获得更多积分，形成正向激励循环。

#### 5. 排行榜时间维度分层

all / week / month 三种排行榜，all 榜鼓励长期贡献者，week/month 榜鼓励新人和近期活跃用户，避免了"老人霸榜"问题。

#### 6. 法律强证据兜底机制

在 AI 分析失败时，法律/监管关键词命中依然能让观察获得 `approved` 状态 + A 级证据 + 默认标签，并且立即参与温度计算。这种 fallback 保证了平台对严重违规内容的响应不依赖于 AI 可用性。

#### 7. 自动通过机制的信任递进

`auto_approve` 标志由管理员授予（非自动），作为对高信誉用户的奖励。这种"先审核建立信任 → 再赋予自动通过权"的模式比纯自动化的信任系统更可控。

#### 8. 限额保护

同一对象 24h 限 10 条、全局 24h 限 50 条的提交限制，有效防止刷分和灌水。

### 6.2 需要改进的地方

#### 6.2.1 信誉与积分的割裂过于彻底

**问题**：信誉分数仅通过观察审核变动，而积分有四种来源。一个用户可能通过大量邀请获得很高积分和等级，但信誉始终停在初始值（或只有少量审核带来的增加）。这导致积分等级（如 L10）和信誉等级（new_user）可能严重不匹配，让"等级"的含金量存疑。

**建议**：
- 让邀请成功也给予小额信誉奖励（如 +1），表示"该用户带来了真实用户"
- 或者让高积分等级自动解锁最低信誉门槛
- 或者在 UI 上将两个体系更明确地区分展示，避免混淆

#### 6.2.2 积分获取存在马太效应

**问题**：积分 = 温度增量 / 10。温度增量受 `evidence_level` 和 `tag.weight` 的乘法效应影响。高 evidence_level（A/B）用户的观察权重是 D 级用户的无穷大倍（因为 D 级 evidence_factor=0 不参与计算）。这意味着新用户提交的初始观察即使内容不错，如果被 AI 判为 C/D 级，几乎无法获得积分。

**建议**：
- 为新人首次通过的观察提供保底积分（如至少 +1 分）
- 或者降低低 evidence_level 的惩罚因子（C 级 0.5 → 0.6）

#### 6.2.3 信誉无衰减机制

**问题**：温度系统有 `runCoolingCycle` 实现自然降温（30 天无活动 -1~-3°C），但信誉分数没有任何衰减。一个早期积累了高信誉的用户，即使长期不活跃甚至后来行为变差，信誉也不会自然下降。

**建议**：
- 引入轻度信誉衰减（如 90 天无审核记录 -1/天，最低降至 50）
- 或者让过期的高信誉在 `auto_approve` 判定中降权

#### 6.2.4 温度增量贡献归属不精确

**问题**：积分按**对象温度的总增量**分配，而非按**单条观察的独立贡献**。如果 10 个人同时提交对同一对象的观察，所有人的观察都被批准后温度从 20 → 50，那么每条观察的贡献者各自获得多少分？目前的设计似乎是每次 recompute 产生 delta 后立即写入一次 `add_contribution`，这意味着**最后一条被批准的观察的提交者**获得了全部 30°C 对应的 3 分，而之前提交的观察者可能只获得当时的小额增量。这造成了积分分配的时序不公平。

**建议**：
- 按观察的 `impact_score` 比例分配温度增量对应的积分
- 或者在重算时回溯补偿之前已批准但未获得充分积分的观察者

#### 6.2.5 信誉等级缺乏实际权益

**问题**：代码中 `REPUTATION_LEVELS` 定义了四级，但除了名称外，没有与任何功能权限挂钩。`auto_approve` 是由管理员手动设置的独立字段，不与信誉等级自动关联。用户看不到升级信誉的实际好处。

**建议**：
- 达到 `trusted_user`（80）自动授予 `auto_approve`
- 达到 `contributor`（150）解锁更多功能（如创建对象、发起话题）
- 在前端展示信誉等级对应的权益说明

#### 6.2.6 驳回惩罚可能过度

**问题**：`personal_attack` 和 `defamation` 各扣 30 分信誉。如果新用户（初始 0 分）第一次提交因措辞不当被判为人身攻击，信誉会跌到 -30，即便初始值实际上是 50（数据库默认值，见 `syncProfilesForAuthUsers` 中 `reputation: 50`）也会跌到 20。但代码中 `reputationLevel()` 从 0 开始，负分仍显示 `new_user`，没有"受限用户"等级。

**建议**：
- 增加负分等级（如 `restricted_user`：<0 分，限制提交频率）
- 或为首次违规提供警告而非直接扣分

#### 6.2.7 积分-温度耦合的循环依赖风险

**问题**：积分通过 `add_contribution` RPC 在温度重算时写入。如果该 RPC 内部有任何逻辑会再次触发温度更新，可能形成无限循环。虽然当前实现中 RPC 似乎只写 `contribution_events` 表，但缺乏显式的循环断路保护。

**建议**：在 `add_contribution` 或 `cascade_referral_bonus` 中确保不触发新的温度重算。

#### 6.2.8 前端"24h 结算延迟"描述与实际不符

**问题**：`points-system.tsx` 页面写道"积分可能会在系统确认温度提升后的 24 小时内到账"，但实际实现中积分在温度重算时**同步写入**（RPC 调用在同一个请求中完成）。这会给用户造成困惑——他们可能等待 24 小时才发现积分早已到账。

**建议**：修正前端文案，或在确实存在异步处理时增加积分"待结算"状态。

#### 6.2.9 缺少积分消耗机制

**问题**：积分是纯累积的，没有任何消耗出口。这导致：
- 早期用户的积分永远无法被追赶
- 积分缺乏"货币"属性，降低了用户获取积分的动机
- 无法通过积分消耗来调节经济系统

**建议**：
- 设计积分商城（兑换徽章、置顶卡、优先审核等虚拟权益）
- 引入季节性重置或赛季机制

#### 6.2.10 查重逻辑粗糙

**问题**：`submitObservation` 中的查重使用基于 bigram Jaccard 相似度的算法，阈值 0.8。但这个实现在 `observations` 表中只取 50 条做比较，且 bigram 切分方式对中文的支持有限（`.match(/.{1,2}/g)` 按字符对切分，不考虑中文分词）。

**建议**：
- 对中文使用更合理的分词策略（如基于词频的相似度）
- 至少对同一用户的重复提交做更强检测
- 考虑使用 `pg_trgm` 或向量相似度

---

## 七、总结

整体而言，这是一个设计思路清晰、工程实现扎实的双轨用户评价系统。积分体系通过"温度挂钩 + 多级返利"构建了完整的贡献激励闭环，信誉体系通过"梯度惩罚 + 自动通过"维持了内容质量底线。两项体系的**分离设计**是核心亮点，避免了单一维度的局限性。

主要改进方向集中在：
1. **增强两套体系的协同**——让信誉影响积分收益，让积分反哺信誉
2. **完善权益挂钩**——让信誉等级带来实际功能差异
3. **修复积分分配的时序公平性**——温度增量归属问题
4. **引入积分消耗出口**——让积分生态闭环
*（内容由AI生成，仅供参考）*
