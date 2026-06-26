## 目标
申请通过后只创建对象卡片，不再自动把申请说明（reason）写成一条观察。只有当用户后续真正提交观察时，观察数才 +1。

## 改动
1. `src/lib/api/platform.functions.ts` · `approveObjectRequest`
   - 删除 `if (reason) { ingestReasonAsObservation(...) }` 分支与相关返回字段（`observation_id` / `temperature` 置空）。
   - 通过后仅完成：建对象 / 发布已存在对象 / 同名合并 / 把 request 标记 approved。

2. `src/lib/api/platform.functions.ts` · `backfillApprovedRequests`
   - 不再把历史 reason 回填成观察，仅补建缺失的对象卡片；返回值 `backfilled` 改为统计补建的对象数，温度字段保持 null。

3. `src/routes/admin.requests.tsx`
   - 去掉提示文案「该申请包含说明内容，通过后将自动生成一条管理员观察并重新计算温度。」
   - 通过成功的 toast 改为「对象已创建」，不再展示温度。
   - 回填按钮文案改为「回填缺失对象卡片」。

不动任何观察表结构、温度引擎、申请表单（reason 字段保留作为审核参考用途）。