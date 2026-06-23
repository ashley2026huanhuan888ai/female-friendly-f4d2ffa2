把"近期升温对象"的右侧 `+3°C` 改成一句可读的解释，包含证据数 / 主话题 / 证据等级 / 温度前后值。

## 后端 `src/lib/api/observation-center.functions.ts`（getHomeSummary）
1. 在并行 fetch 中加一项：拉取近 7 天 `status='approved'` 的 observations（字段 `object_id, evidence_level, tags`）。
2. 计算 heating 候选对象后，对每个 heating 对象聚合这批 obs：
   - `evidence_7d_count` = 条数
   - `top_tag` = 出现最多的 tag（无则 null）
   - `top_evidence_level` = 出现最多的等级（A/B/C，无则 null）
3. `pack(heatIds)` 输出每项追加：`evidence_7d_count`、`top_tag`、`top_evidence_level`、`temperature_before = round(temperature - delta_7d, 1)`、`temperature_after = temperature`。

cooling 同样处理，便于对称展示"降至"。

## i18n `src/lib/i18n.tsx`
新增键（中/英）：
- `home.heatingDetail.full`：`因新增 {count} 条关于"{tag}"的 {level} 级证据，争议温度由 {before}°C 升至 {after}°C。`
- `home.heatingDetail.noTag`：`因新增 {count} 条 {level} 级证据，争议温度由 {before}°C 升至 {after}°C。`
- `home.heatingDetail.noLevel`：`因新增 {count} 条关于"{tag}"的新证据，争议温度由 {before}°C 升至 {after}°C。`
- `home.heatingDetail.minimal`：`争议温度由 {before}°C 升至 {after}°C。`
- `home.coolingDetail.*`：对应"降至"版本。

英文版同结构。

## 前端 `src/routes/index.tsx`（HeatingList 组件）
- 取消右侧 `+N°C` 数字。
- 列表项布局改为：温度计 + 右侧两行（第一行：类型 + 对象名；第二行：根据字段可用性选择对应模板渲染的小字描述，`text-xs text-muted-foreground leading-5`）。
- positive 用 heating 模板，否则 cooling 模板。

不改动数据库与其它页面。