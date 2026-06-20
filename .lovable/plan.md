## 目标
手机端 Hero 横向溢出（"搜索" 被切成 "搜"，右侧档案纸超出视口）。让场景在 ≤640px 视口内严格贴合宽度，不再左右溢出。高度可滚动，不强制塞进一屏。

## 根因
`.archive-editorial-scene` 在 ≤1100px 用 `width: 1760px` + `transform: scale()` 缩放。transform 不改变布局盒子尺寸：1760px 盒子仍按 1760px 占位，`margin-inline: auto` 在 390px 容器里会让它向左右各溢出 ~685px。当前 `overflow-x: hidden` 只剪掉视觉，但 scale 的 `transform-origin: top center` 是相对 1760px 盒子中心，未必正好回到视口中心，导致右侧仍可见溢出。

## 改动（只改 `src/styles.css`）
1. `.archive-editorial-scene` 在 ≤1100px 媒体查询里改用 `transform-origin: top left`，并把水平居中改为 `margin-inline: 0`；同时给容器加 `margin-left: calc((100% - 1760px * var(--scene-scale)) / 2)` 让缩放后的视觉宽度水平居中。
2. 在 ≤640px 媒体查询中，`--scene-scale` 公式由 `calc((100vw - 1.4rem) / 1760)` 调整为 `calc((100vw - 1.6rem) / 1760)`，留出 0.8rem 安全边以避免子元素阴影/旋转造成的次像素溢出。
3. `.archive-editorial-first` 已有 `overflow-x: hidden`，保留作为兜底。
4. 验证：Playwright 在 390×745 视口加载 `/`，截图首屏，确认场景四张纸完整位于视口内、右侧不再被切、横向滚动条不出现（`document.documentElement.scrollWidth === clientWidth`）。

## 不动
- TSX 结构、桌面端样式、其它 section、字体与颜色 token。