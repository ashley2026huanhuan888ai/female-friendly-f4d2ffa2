## 目标
在展示 AI 观察证据摘要文本时，自动加粗领域关键词，便于快速抓取。

## 方案
使用前端关键词词典 + 正则匹配，渲染时把命中片段包成 `<strong class="font-semibold text-foreground">`。无需后端改动、无需调用 AI，零成本、即时生效。

## 关键词词典（初版，可扩展）
针对项目主题（性别议题观察）的高信息密度短语：
- 性别刻板印象、刻板印象、性别角色、传统性别角色
- 物化、工具化、客体化、边缘化、污名化、规训
- 厌女、仇女、男凝、凝视、爹味
- 受害者有罪论、贞洁叙事、母职惩罚、容貌焦虑、身材焦虑
- 权力差、权力不对等、结构性歧视、系统性歧视
- 沉默、噤声、消音
- 固化、强化、合理化、美化、浪漫化

匹配规则：最长优先、不区分大小写、避免重叠。

## 改动文件
1. **新增** `src/lib/highlight-keywords.tsx`
   - 导出 `highlightKeywords(text: string): ReactNode`
   - 内置词典（按长度降序排列），用一次正则切分文本，命中片段包成 `<strong>`
2. **`src/routes/index.tsx`** L248：`{o.summary ...}` → `{highlightKeywords(o.summary ?? ...)}`
3. **`src/routes/archive.evidence.tsx`** L77：`{it.summary}` → `{highlightKeywords(it.summary)}`

## 不改动
- 标签 / 元信息行不加粗（信息密度已经够高，避免视觉噪音）
- 不引入分词库（jieba 等），保持轻量

如确认，进入 build 后实施。
