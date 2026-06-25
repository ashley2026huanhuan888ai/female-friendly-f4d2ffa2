## 问题
导出卡片正文使用 `o.cleaned_content || o.content`，`cleaned_content` 是 AI 清洗后的精简文本（常被截断到 500/1000 字），因此导出图丢失了观察原文。

## 修正
在 `src/lib/exportCanvas.ts` 中，把正文渲染从 `cleaned_content || content` 改为直接使用 `o.content`（观察原文，一字不漏），共 3 处：
- 字体预加载样本（第 93 行）
- 内容高度测量（第 319 行）
- 正文绘制（第 496 行）

`summary`（一句话摘要）保留在正文之上，作为标题不动；只改正文来源。

不动其他页面（详情页、归档页）的展示逻辑。