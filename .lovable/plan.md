## 问题

手机首屏图片（1280×1923 竖图）目前虽然以 `width: 100%; height: auto` 渲染，但所在的 `.archive-editorial-first` 容器仍保留了：
- `padding: 4rem 0 0`（顶部 4rem 木纹背景露出）
- 深色木纹 + 网格线背景
- `::before` 一层带 `mix-blend-mode: soft-light` 的纹理叠层

这些会让图片顶部被 header 区遮挡，并让纹理覆盖在图片上，造成"内容被裁切/盖住"的视觉效果。

## 改动（仅 `src/styles.css` 的 `@media (max-width: 640px)` 内）

1. `.archive-editorial-first`：
   - `padding: 0`
   - `background: var(--color-background)`（去掉深色木纹）
   - `border-bottom: none`
2. 新增 `.archive-editorial-first::before { display: none; }`，去掉纹理叠层
3. `.archive-editorial-mobile-hero`：
   - 保持 `display: block; width: 100%; height: auto`
   - 追加 `max-width: 100%; object-fit: contain`，确保不会被任何父级裁切

桌面 / 平板（>640px）样式不动，保持原有第一屏档案场景。

不动 `src/routes/index.tsx`，不动其他组件、不动业务逻辑。