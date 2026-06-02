## 目标

暂停新功能，优先把“法律/监管强证据不得低温”的产品规则固化到代码里，并让所有温度写入路径经过同一个规则入口。

## 已定位的主要问题

1. `src/lib/api/platform.functions.ts`
   - `recomputeObjectInternal` 在 approved observations 为 0 时仍直接写入 `temperature: 24`，会制造“舒适/低温”的假状态。
   - `recomputeTemperature` 的手动温度路径会先调用旧内部函数，再二次 `update({ temperature: finalT })`，属于绕过统一事件/解释链的直接写入。
   - `ingestReasonAsObservation` 在 `recomputeObjectWithEngine` 之后又可能二次直接写 `objects.temperature`。
   - `reviewObservation`、自动通过、合并对象、对象申请通过等都调用 `recomputeObjectInternal`，而该函数包含旧逻辑和 24°C 默认值。

2. `src/lib/api/bulk-import.functions.ts`
   - 自己维护一套 `REGULATORY_KW` / `detectEvidenceA`，与 `temperature-rules.ts` 的 `detectRegulatoryPenalty` 不一致。
   - 新对象插入时写 `temperature: 20`，后续又在重算后可能二次 `update({ temperature: final })`。
   - `let final = result?.temperature ?? 24` 仍保留 24°C fallback。

3. `src/lib/temperature-rules.ts`
   - 监管/法律关键词不完整：缺少劳动仲裁、司法裁判、违法事实成立、明确法律责任等。
   - 当前规则只有“A 级证据 + 严重标签”才可能抬高到高温；如果有行政处罚/判决/罚款但标签没命中，最低温只可能是 45 或 20，不能满足“强证据至少 90°C”。
   - tag 匹配为原始字符串精确匹配，空格、斜杠、英文别名、大小写都可能导致规则地板失效。

4. `src/lib/temperature-engine.ts`
   - 纯公式使用平均值，会把强证据放进平均分；虽然理论上后面有 rule floor，但 rule floor 当前识别不稳，所以会出现被平均值稀释。
   - cooling 传入后参与基础计算，但最终必须始终 `max(calculated, ruleMinimum)`。

5. `src/lib/temperature.ts` 与 UI
   - `computeTemperature([])` 仍返回 24，虽然可能是旧兼容函数，但属于危险默认值。
   - `bandOf` 只按数字算标签；UI 需要继续用 `observation_count === 0` 走 unmeasured，避免 0 观察对象显示低温。

## 修复计划

### 1. 建立统一强证据与标签规范化模块

修改 `src/lib/temperature-rules.ts`：

- 合并并导出唯一关键词来源：
  - `LEGAL_REGULATORY_PATTERNS`
  - `detectLegalPenalty`
  - `detectRegulatoryPenalty` 作为别名/兼容导出
  - `detectEvidenceA` 作为兼容导出，供批量导入与对象申请复用
- 关键词覆盖：法院判决、司法裁判、劳动仲裁、行政处罚、监管处罚、罚款、立案调查/立案查处、处罚决定书、处罚告知书、官方通报、违法事实成立、明确法律责任、责令整改、约谈、没收、公益诉讼等。
- 增加 `normalizeTag` / `normalizeTags`：
  - trim
  - lower-case
  - 去除多余空格、全角/半角差异、斜杠差异
  - 支持常见英文/中文别名映射到 canonical `knowledge_tags.name_zh`
- 修改 `calculateRuleMinimumTemperature`：
  - 只要文本命中法律/监管强证据，就把 effective evidence 视为 A。
  - 只要存在法律/监管强证据，`rule_minimum_temperature >= 90`，不再依赖 severe tag 是否命中。
  - severe tag 规则保留，但不能低于法律/监管 90 floor。
- 修改 `aggregateRuleMinimum`：使用 normalize 后的 tags 和统一 legal detector。

### 2. 统一唯一温度计算入口

修改 `src/lib/api/temperature.functions.ts`：

- 将 `recomputeAndPersist` 作为唯一写 `objects.temperature` / `heat_sources` / `cooling_sources` / `temperature_events` 的入口。
- approved observations 为 0 时：
  - 不再写 24°C。
  - 写 `observation_count: 0`、清空 heat/cooling sources。
  - 可保留当前 temperature 字段不作为展示依据，或写入安全底值但 breakdown 标记 `unmeasured: true`；UI 仍按 `observation_count === 0` 显示“暂无温度”。
  - 事件 reason 标记为 `unmeasured`，不制造“舒适区”解释。
- 最终温度恒定为：
  - `calculatedTemperature = runEngine(...).temperature`
  - `ruleMinimum = aggregateRuleMinimum(...).rule_minimum_temperature`
  - `finalTemperature = max(calculatedTemperature, ruleMinimum)`
- cooling 只能影响 `calculatedTemperature`，不能突破 `ruleMinimum`。
- 对相同输入重复 recompute 结果稳定，不因历史 `before` 或事件回放而下降。

### 3. 废弃平台旧温度写入路径

修改 `src/lib/api/platform.functions.ts`：

- 将 `recomputeObjectInternal` 改成薄包装：只调用 `recomputeObjectWithEngine`，再更新 `ai_summary/top_tags/analysis_logs`；不再直接写 `temperature: 24`。
- `recomputeTemperature` 手动温度路径不再二次直接覆盖温度；改为通过统一入口拿到 rule floor 后，仅允许 admin temperature 作为额外 floor，最终仍由统一逻辑写入和记录事件。
- `ingestReasonAsObservation` 不再重算后再次直接 `update temperature`。
- `submitObservation` / `reviewObservation` / `mergeObjects` / `approveObjectRequest` 保持业务流程，但全部落到统一重算入口。
- object request reason 的 evidence A 判断改用 `temperature-rules.ts` 导出的统一函数。

### 4. 批量导入改用统一识别与重算

修改 `src/lib/api/bulk-import.functions.ts`：

- 删除本地 `REGULATORY_KW` 和本地 `detectEvidenceA`，改为从 `temperature-rules.ts` 导入。
- 新对象不再写业务意义上的舒适默认温度；避免 `temperature: 20/24` 被误解为最终温度。
- 删除 `result?.temperature ?? 24` fallback。
- 删除重算后的二次直接 `update temperature`，如需 admin floor，走统一入口参数或统一 helper。

### 5. UI / band 安全兜底

修改必要 UI 文件：

- 继续确保详情页、首页对象卡、列表卡在 `observation_count === 0` 时传 `unmeasured`，显示“待测评/暂无温度”。
- 检查对象列表、话题页、个人页、档案页是否还有 0 观察却直接显示温度的地方；仅做最小必要修复，不重设计 UI。
- `bandOf` 不改变已定义区间，但不让 unmeasured 走 band label。

### 6. 新增自动化测试

新增 Vitest 测试与必要测试脚本：

- `src/lib/temperature-rules.test.ts`
- `src/lib/temperature-engine.test.ts` 或统一测试文件

覆盖 8 个用例：

1. `行政处罚` + `罚款` + `处罚决定书` => final >= 90。
2. `法院判决` + `违法事实成立` => final >= 90。
3. 低风险观察后新增法律惩罚观察，重算不得下降，final >= 90。
4. AI/基础分低风险时，法律强证据仍 final >= 90。
5. cooling cycle 传入负值时，final 仍不低于 rule floor。
6. approved observations 为 0 时，不返回/写入 24°C 舒适结论，应标记 unmeasured 或 observation_count=0。
7. 同一输入重复 recompute 结果稳定。
8. 中文标签、英文标签、大小写、空格、斜杠差异都能 normalize 到同一规则。

### 7. 验证方式

- 不运行 rebuild。
- 运行针对新增测试的 `bunx vitest run ...`。
- 用搜索确认：
  - 不再存在危险 `temperature: 24` 写入路径。
  - 不再存在多个监管关键词表。
  - 所有温度写入都集中在 `temperature.functions.ts` 的统一入口。

## 交付报告将包含

1. 根因。
2. 修改文件清单。
3. 删除/废弃的错误路径。
4. 当前唯一温度计算入口。
5. 法律/监管强证据识别方式。
6. 为什么 AI、平均值、冷却不会再压低强证据对象。
7. 新增测试清单。
8. 如果能从现有数据定位到该具体对象，会报告修复前后温度；否则说明需要对象名或 ID 才能给出精确值。
9. 为什么修复后符合“女性友好风险温度计”的产品规则。