## 目标
在手机界面隐藏首页的「对象身份 / OBJECT IDENTITY」整张卡片（截图中所示的左侧档案卡），桌面端保持不变。

## 改动
- `src/styles.css`：在 `@media (max-width: 760px)` 中为 `.case-paper-left` 添加 `display: none;`，使该卡片在手机端不渲染且不占空间，同时不影响 `case-paper-main` 与 `case-paper-right` 的横滑展示。

## 不改动
- 桌面端布局与内容
- JSX 结构、数据获取逻辑
