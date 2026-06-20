## 目标
删除首页顶部导航条（.archive-editorial-top-strip）后，将场景内三张主体卡片整体向上平移，消除顶部空白，恢复视觉平衡。

## 调整范围
- 首页首屏（.archive-editorial-first 及 .archive-editorial-scene）
- 仅针对桌面端布局（移动端通过 scale 适配，不受影响）

## 具体调整
1. **三张主体卡片上移**
   - `.archive-editorial-hero-sheet`：`top` 从 `7rem` 减至 `1rem`
   - `.archive-editorial-record-sheet`：`top` 从 `9rem` 减至 `3rem`
   - `.archive-editorial-submit-sheet`：`top` 从 `10rem` 减至 `4rem`
   三张卡片保持原有的相对间距（约 2rem / 1rem 的层级差）与旋转角度不变。

2. **背景底衬同步上移**
   - `.archive-editorial-underlay-a`：顶部内边距从 `1.4rem` 减至 `0.6rem`
   - `.archive-editorial-grid-paper`：顶部内边距从 `6.8rem` 减至 `1.2rem`
   确保背景网格与卡片的新位置对齐，不出现断层。

3. **温度卡片底部留白微调**
   - `.archive-editorial-temperature-card`：`bottom` 从 `4.5rem` 增至 `5.5rem`
   卡片整体高度略微压缩，底部温度条稍向下避让，保持画面重心居中。

4. **外容器 padding 微调**
   - `.archive-editorial-first`：`padding-top` 从 `5.6rem` 减至 `4rem`
   减少场景顶部的外部空白，使首屏内容更紧凑。

## 验证方式
- 本地预览检查首屏顶部无大面积空白
- 确认三张卡片的上下边缘均不与场景边界重叠
- 确认温度卡片的刻度条与三张卡片底部保持协调间距