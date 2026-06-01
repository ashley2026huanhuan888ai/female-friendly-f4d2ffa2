## Temperature Intelligence Center V1

围绕"每一次温度变化都有依据、可解释"重构温度引擎，并新增展示与后台。

### 1. 数据库（migration）

**knowledge_tags 扩展**
- `polarity` enum: `negative` | `positive`（默认 negative，迁移既有标签为 negative）
- 种子 6 个正向标签：平等表达、多元角色、专业能力展示、尊重选择、反刻板印象、女性主体性（weight 取负值用于降温计算）

**temperature_events 新表**（温度时间线 / 审计）
- `object_id`, `observation_id?`, `delta`, `temperature_after`,
  `reason`（heat/cool/positive_case/cooling_cycle/manual_admin），
  `breakdown jsonb`（{knowledge, evidence, case, trend, positive}），
  `note`, `actor_id?`, `created_at`
- RLS：anon/auth 可读（公开时间线）；admin 可写；service_role 全权

**objects 扩展**
- `last_cooled_at timestamptz`
- `heat_sources jsonb`、`cooling_sources jsonb`（缓存 Top 升/降温来源）

### 2. 温度计算引擎（`src/lib/temperature-engine.ts`，纯函数）

```text
T = clamp(20, 100, 20 + Σ KnowledgeImpact + Σ EvidenceImpact
                    + Σ CaseImpact + TrendImpact - PositiveImpact)
```
- **KnowledgeImpact** = tag.weight × evidence_factor × polarity_sign
- **EvidenceImpact**: A=1.0, B=0.8, C=0.5, D=0
- **CaseImpact**: 引用 knowledge_cases 数量加权（negative +, positive −）
- **TrendImpact**: 最近 14 天观察数 vs 历史均值的对数差
- **Cooling**: 距 `last_cooled_at` ≥ 30 天且窗口内无新观察 → −1~−3°C

每次 approve / reject / admin 调整都：
1. 重算温度
2. 写入 `temperature_events`（含 breakdown）
3. 更新 `objects.temperature`、`heat_sources`、`cooling_sources`

### 3. Server functions（`src/lib/api/temperature.functions.ts`）

- `recomputeObjectTemperature(objectId)` — 管理员触发
- `getTemperatureExplanation(objectId)` — 返回当前 breakdown + Top heat/cool sources
- `getTemperatureTimeline(objectId, limit)` — 时间线事件
- `runCoolingCycle()` — 批量自然降温（可手动触发，预留 cron）
- `getDashboardStats()` — 排行榜 / 升温最快 / 降温最快 / 改善案例

接入既有 `reviewObservation` 流程：审批通过后调用 `recomputeObjectTemperature`。

### 4. 前端

**对象详情页 `/objects/$id`**
- 新区块「为什么是这个温度？」可展开，显示 4 类贡献条形 + 数值
- 「主要升温来源」「主要降温来源」标签云
- 「温度时间线」组件（复用 `ObjectTimeline` 扩展，加入 delta 与原因）

**新页 `/admin/temperature`**
- 温度排行榜 / 升温 Top / 降温 Top / 争议最高 / 女性友好改善案例
- 操作：重算单对象温度、手动触发冷却周期
- 单对象抽屉显示完整 breakdown 与最近事件

**`/admin` 顶部导航**新增「温度中心」入口。

### 5. 解释性 UI 组件

- `TemperatureBreakdown.tsx` — 4 类贡献堆叠条
- `HeatSources.tsx` — 升/降温来源彩色 chip
- `TemperatureTimeline.tsx` — 事件流（日期 · Δ · 原因 · 引用观察）

### 6. 不做（V1 范围外）
- 行业平均 / 跨对象对比报告
- 自动化 pg_cron 调度（仅留手动按钮 + 后续接入位）
- 年度榜单 / 白皮书导出

### 文件
**新建**：migration、`src/lib/temperature-engine.ts`、`src/lib/api/temperature.functions.ts`、`src/components/TemperatureBreakdown.tsx`、`src/components/HeatSources.tsx`、`src/components/TemperatureTimeline.tsx`、`src/routes/admin.temperature.tsx`
**修改**：`src/lib/api/platform.functions.ts`（接入引擎）、`src/routes/objects.$id.tsx`（解释面板）、`src/routes/admin.tsx`（导航）、`src/integrations/supabase/types.ts`（自动）
