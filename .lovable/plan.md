## 问题
手机端固定顶部导航遮住了第一张卡片的"不舒服，"标题。

## 调整
在 `src/styles.css` 的 `@media (max-width: 640px)` 中，将 `.archive-editorial-first` 的 `padding-top` 从 `1.5rem` 增加到约 `5.5rem`，为顶部固定导航留出空间，让 Hero 卡片完整可见。