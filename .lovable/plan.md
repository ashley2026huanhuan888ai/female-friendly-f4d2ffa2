## 对象详情页布局调整

仅修改 `src/routes/objects.$id.tsx` 头部区域：

1. **温度移到标题右侧并排**（移动端 + 桌面端统一）
   - 将外层 grid 由 `md:grid-cols-[1fr_auto]` 改为 `grid-cols-[minmax(0,1fr)_auto]`（移动端即生效）
   - 标题 `<h1>` 字号在窄屏自动缩小（`text-3xl sm:text-5xl md:text-6xl`），并加 `min-w-0`
   - Thermometer 容器加 `shrink-0`，与「已审核观察 N · 类型」行并排
   - "为什么是这个温度?" 按钮保持在温度计下方

2. **AI 总结区域 → 最新观察原文**
   - 移除 `obj.ai_summary` 块与对应 i18n
   - 改为显示 `obs[0]` 的 `content`（最新一条已审核观察原文），标签文本改为「最新观察」
   - 若暂无观察则显示「暂无观察」占位
   - 新增 i18n key `objectDetail.latestObservation` / `objectDetail.noObservation`（中英文）

不改动后端、数据加载与其他模块。
