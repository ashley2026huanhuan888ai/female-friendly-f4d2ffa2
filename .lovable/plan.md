## 目标

1. 任何提交都先 `INSERT observations`，AI 失败也不丢数据
2. AI 失败 → 观察 pending + `admin_note` 记录原因
3. 命中法律/监管关键词的内容即使 AI 失败也强制 `evidence_level='A'` + `risk_level='high'` + 写入女性友好标签，让温度规则地板立刻生效
4. 前端文案改成真话
5. 用绝味鸭脖案例验收

## 改动 1：`src/lib/api/platform.functions.ts` → `submitObservation`

新流程：

```text
1) 限额检查（同前）
2) 复用现有 detectLegalPenalty() 扫描 content，得到 hasLegalPenalty
3) INSERT observations（必须先成功，拿到 id）：
   {
     object_id, user_id, content, scene, screenshot_url, reference_url,
     status: 'pending',
     evidence_level: hasLegalPenalty ? 'A' : null,
     tags: hasLegalPenalty ? ['女性物化','性别歧视营销','低俗擦边营销'] : [],
     risk_level: hasLegalPenalty ? 'high' : 'low',
     confidence: 0,
     admin_note: hasLegalPenalty ? '法律强证据预标注（待 AI 复核）' : null,
   }
4) try {
     并行 callAIRiskCheck + callAIAnalyze + 查重 + profile
     UPDATE observations SET cleaned_content, facts, summary, evidence_level,
       tags, confidence, risk_level, risk_reasons, duplicate_of, similarity_score,
       principles_matched, cases_cited, explanation, impact_score
     若 auto_approve & risk=low & ev≠D & !duplicate → status='approved'
        → recomputeObjectInternal + apply_reputation_delta
     若 hasLegalPenalty → 即使 AI 给的 evidence_level<'A' / tags 少，
        仍合并：evidence_level='A'，tags = union(AI tags, 三个 fallback 标签),
        risk_level = max('high', AI risk)
     return { id, status, ai_failed:false, ... }
   } catch (aiErr) {
     UPDATE observations SET
       admin_note = 'AI 分析失败: <message>' (+ 法律预标注说明)
     // 不修改 evidence_level/tags/risk_level（已在 step 3 写好 fallback）
     // 不抛错
     return { id, status:'pending', ai_failed:true, error: aiErr.message,
              has_legal_penalty: hasLegalPenalty, tags: <step3 的 tags>,
              evidence_level: <step3 的 ev>, risk_level: <step3 的 risk>,
              summary:null, ... }
   }
5) hasLegalPenalty 时（无论 AI 成功失败）触发一次 recomputeObjectInternal()
   让温度规则地板（法律 90°C / 语义关键词）即刻反映
```

不抛错的关键：把 try/catch 包住整个 AI 与 UPDATE 段，catch 里只更新 admin_note，绝不 throw。

## 改动 2：前端 `src/routes/submit.$objectId.tsx`

- `runAnalysis()` 不再 `try/catch` 跳 `error` 阶段；而是检查返回 `res.ai_failed`：
  - `ai_failed === true` → 跳 `phase='ai_failed'` 新阶段
  - 否则走 `phase='done'`
- 真正的网络/422 错误（serverFn 本身抛错）才走 `phase='error'`
- 新阶段文案：
  - 标题："观察已保存为待审"
  - 正文："AI 分析暂时失败，管理员会重新分析。该观察已在数据库中，可在『我的观察』查看。"
  - 若 `has_legal_penalty` 再补一句："已识别为法律强证据，对象温度已即时更新。"
- "一键重试分析"按钮调用现有 `regenerateObservation({ observation_id: res.id })`

## 改动 3：测试

新增 `src/lib/temperature-rules.test.ts` 用例（如已有同名文件就追加）：

```ts
// 绝味鸭脖回归测试
test("legal penalty content forces floor >= 90", () => {
  const r = aggregateRuleMinimum([
    {
      tags: ["女性物化", "性别歧视营销", "低俗擦边营销"],
      evidence_level: "A",
      content: "长工商案字〔2017〕91号 责令停止发布违法广告 罚款60万元 违反《广告法》第9条第7项",
    },
  ]);
  expect(r.rule_minimum_temperature).toBeGreaterThanOrEqual(90);
  expect(r.has_regulatory_penalty).toBe(true);
});
```

执行 `bunx vitest run src/lib/temperature-rules.test.ts`

## 验收（绝味鸭脖）

提交后 SQL 验证：

```sql
select id, status, evidence_level, tags, risk_level, admin_note
from observations where content like '%长工商案字%' order by created_at desc limit 1;
-- 期望：1 行；evidence_level='A'；tags 至少含女性物化；risk_level='high'

select temperature from objects where name ilike '%绝味%';
-- 期望：>= 90（法律地板）
```

UI 验证：

- 提交完成不再"消失"；要么显示分析结果，要么显示新文案"已保存为待审 + AI 失败"
- 管理后台 admin.observations 能看到这条
- 对象详情页"观察列表"能看到这条（即使 pending 用户也能看到自己的：现有 RLS 已允许）

## 不动的事

- 不改 RLS、不改 schema、不动温度引擎公式、不动管理员审核流程
- 复用 `detectLegalPenalty` 与 `recomputeObjectInternal`，不复制逻辑
