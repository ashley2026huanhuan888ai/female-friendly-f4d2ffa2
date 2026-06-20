## 目标
手机预览下，首页第一屏 `EditorialArchiveFirstPage`（`.archive-editorial-first` / `.archive-editorial-scene`）目前在 ≤1100px 时被改为竖向堆叠的 grid 布局，每张档案纸都被拉成全宽方块、丢失旋转和层叠。你希望它保持桌面版那种"档案展开铺在桌面上"的视觉，而不是收敛成手机长列表。

## 方案
在 `src/styles.css` 调整 `.archive-editorial-scene` 在窄屏下的响应式规则，让它继续以原始的 16:9 绝对定位舞台呈现，并通过横向缩放适配手机宽度。

### 具体改动（只动 CSS，不动结构 / 业务逻辑）
1. `@media (max-width: 1100px)` 内：
   - 删除把 `.archive-editorial-scene` 改成 `display: grid` 的规则
   - 删除把 `.archive-editorial-sheet` 改成 `position: relative` + 去旋转的规则
   - 保留顶部导航条 (`.archive-editorial-top-strip`) 自身的可滚动调整，避免溢出
2. 给 `.archive-editorial-scene` 增加 `transform: scale(var(--scene-scale))` + `transform-origin: top center`，在 ≤1100 / ≤640 两档分别设 `--scene-scale: 0.7 / 0.46`，并用 `--scene-w` 让其宽度仍按桌面 1760px 渲染。
3. 外层 `.archive-editorial-first` 在窄屏改为 `overflow-x: hidden` 并通过 `min-height` 容纳缩放后的高度，保证不出现横向滚动条。
4. `@media (max-width: 640px)` 中只保留与温度卡、品牌字号相关、和 hero 展开不冲突的样式；不再强制 `.archive-editorial-temperature-card` 变单列。

### 不改的
- TSX 结构、文案、组件、数据逻辑
- 桌面端（>1100px）样式
- 其他 section（`home-case-board`、archive-desk 等）

## 验证
改完用 Playwright 在 375×812 viewport 截图 `/`，确认四张档案纸仍按原始相对位置铺开、整体在视口内可见。
