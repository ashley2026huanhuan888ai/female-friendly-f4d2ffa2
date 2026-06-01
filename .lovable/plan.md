# Admin Governance System V1

为平台构建治理系统，保证观察数据质量、AI 分析有效性，防止刷屏/攻击/广告/情绪污染。

## 1. 数据库变更（一次 migration）

### observations 表扩展
- `risk_level` enum(low/medium/high) 默认 low
- `risk_reasons` jsonb 默认 `[]`（AI 检测到的风险点：abuse/ad/spam/duplicate/extreme...）
- `rejection_reason` enum：too_short / no_facts / pure_emotion / duplicate / advertisement / personal_attack / defamation / off_topic
- `duplicate_of` uuid 可空（指向相似观察）
- `similarity_score` numeric 可空
- 状态枚举补齐：draft / pending / approved / rejected / archived（当前已有 pending/approved/rejected，新增 draft/archived）

### profiles 表扩展
- `reputation` int 默认 50
- `reputation_level` 由 reputation 推导（视图或前端计算）：new_user(<50) / trusted_user(>=80) / contributor(>=150) / research_contributor(>=300)
- `auto_approve` bool 默认 false（reputation >= 80 自动置 true，通过 trigger）

### 新表 audit_logs
- id, actor_id, action（text）, target_type（object/observation/request/user）, target_id, before jsonb, after jsonb, reason text, created_at

### 新表 reputation_events
- id, user_id, delta int, reason text, observation_id 可空, created_at

### 新函数 / 触发器
- `public.check_user_submit_limit(user_id, object_id)` security definer：返回是否超出 24h 限制（同用户 3 条 / 同用户对同对象 1 条）
- `apply_reputation_delta(user_id, delta, reason, obs_id)` security definer
- trigger：reputation 更新后自动更新 auto_approve
- objects 表新增 `merged_into uuid`（合并到另一对象）、`hidden bool`（隐藏不删）

### RLS
- audit_logs：仅 admin 读
- reputation_events：用户读自己 + admin 全读
- profiles：用户可读自己的 reputation

## 2. 服务端（server functions）

`src/lib/api/platform.functions.ts` 扩展：

- `submitObservation`：
  - 先调 `check_user_submit_limit`，超限抛错
  - AI 第一步：风险审查（输出 risk_level + risk_reasons + 是否建议直接 reject）
  - 简单文本相似度检测（pg_trgm 或简单 JS：与同对象近 30 天内 approved 观察对比 trigram，>=0.8 标 duplicate_of）
  - 之后再走原有 facts/tags/evidence 提取
  - 如果用户 `auto_approve=true` 且 risk=low 且非 duplicate：直接 status=approved，并自动 recompute 温度
  - 否则 status=pending
  - 写 reputation_events（提交本身不加分）
- `reviewObservation({id, decision: approve|reject, rejection_reason?, admin_note?, tags?, evidence_level?, impact_score?})`：
  - 写 audit_log
  - 调 reputation delta（approve +5，附 reference_url +10；reject -10；ad -20；attack -30）
- `mergeObjects({source_id, target_id})`、`freezeObject`、`hideObject`、`deleteObject`、`updateObjectCategory`：admin only，每个写 audit_log
- `getAdminAnalytics()`：返回近 30 天新增数、通过率、高风险数、对象增长、温度变化、Top 对象/用户

## 3. 前端

### Admin 增强
- `/admin/observations`：新增筛选（状态/风险等级），列展示 AI 风险等级 + 重复标记，行点击展开 AI Review Panel（原始内容 / facts / tags / evidence / impact / risk / 温度贡献预估），按钮组：通过 / 驳回（选择原因）/ 修改标签证据
- `/admin/objects`：新增合并 / 冻结 / 隐藏 / 删除 / 改分类
- `/admin/analytics`：新页签 Dashboard（数字卡片 + 简单趋势）
- `/admin/audit`：审计日志列表
- `/admin/users`：用户信誉列表（搜索、手动调整）

### 用户端
- 提交页：提示 24h 限额；信誉徽章显示在导航栏（登录后）
- 被驳回观察在「我的观察」可见驳回原因（保留入口或简单提示）

## 4. 技术细节

- 相似度：启用 `pg_trgm` 扩展，新增 GIN 索引 `observations(cleaned_content)`，submit 时 `SELECT id, similarity(cleaned_content, $1) FROM observations WHERE object_id=$2 AND status='approved' ORDER BY 2 DESC LIMIT 1`
- AI 风险审查：单独 prompt，要求 JSON `{risk_level, reasons[], suggested_action}`，模型 `google/gemini-2.5-flash`
- 审计：每个 admin 写操作统一通过 helper `writeAuditLog(actor, action, target, before, after, reason)`
- 不开发：多管理员等级、专家审核员、社区志愿审核员（V2）

## 5. 文件清单（新增/修改）
- migration（1 个）
- `src/lib/api/platform.functions.ts`（扩展）
- `src/lib/api/governance.functions.ts`（新，admin 操作）
- `src/lib/reputation.ts`（信誉等级常量）
- `src/routes/admin.observations.tsx`（重写）
- `src/routes/admin.objects.tsx`（增强）
- `src/routes/admin.analytics.tsx`（新）
- `src/routes/admin.audit.tsx`（新）
- `src/routes/admin.users.tsx`（新）
- `src/components/admin/AIReviewPanel.tsx`（新）
- `src/routes/admin.tsx`（加导航 tab）
- `src/routes/submit.$objectId.tsx`（加限额提示）
- `src/components/SiteLayout.tsx`（导航显示信誉）

确认后开始实施。
