在首页"正在被观察"词云的提示文案下方新增一行来源说明。

## 改动
- `src/lib/i18n.tsx`：新增键 `home.topicWall.trust`
  - 中文："来源可追溯 · AI 辅助整理 · 人工审核 · 支持纠错"
  - 英文："Traceable sources · AI-assisted · Human-reviewed · Corrections welcome"
- `src/routes/index.tsx`：在现有 `home.topicWall.hint` 段落下方追加一行小字（`text-xs text-muted-foreground`）显示 `home.topicWall.trust`。

不改动业务逻辑与样式系统，仅前端文案。