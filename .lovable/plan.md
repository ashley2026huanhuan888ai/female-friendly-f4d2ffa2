## 选定方向：v1 温度刻度条 · 经典刊物

按用户选中的 v1 原型，重写 `src/components/ExportCardDialog.tsx` 里的离屏渲染卡片（约第 513–712 行），保留所有现有数据接线（i18n、object/observation 字段、QR、tempBand 颜色、配置选项）。

## 版式改造

1. **顶部刊头（更紧凑）**
   - 左：芭比粉色 BRAND/品牌类型胶囊标签 + 等距字体的档案编号 FF-XXXX
   - 左下：「女性友好体验存档」大字 + 小写英文副标
   - 右：缩小的 QR 码（132px）+ "扫码查看完整档案"
   - 分隔线由黑色实线改为 `INK20` 浅灰

2. **对象名 + 温度刻度条（新增主视觉）**
   - 对象名作为整张图最大标题（92/76/60 三段自适应），不再挤在刊头里
   - 下方一条横向 thermometer：背景灰条 + `tempBand.color` 按温度百分比填充 + 右侧 72px 温度数字 + °C
   - 温度数字与刻度条共享 `tempBand.color`，呼应主页温度色

3. **观察条目（左侧 A/B 标记列 + 右侧内容流）**
   - 左侧 64px 列：圆形 evidence 字母圈（A/B/C/D，无 evidence 时显示序号）+ 下方 № 01/02 等距编号
   - 右侧：标签行（粉色 #tag，scene 大写灰字）→ summary 大字 → 正文 → 截图（若有）→ 日期小字
   - 条目之间用极细分隔线 `INK10`，不再用整块白色卡片

4. **页脚**：日期 | 导出者：xxx ｜ 右侧大写对象名（粗体）。去掉冗余的档案编号重复（已挪到刊头）。

## 不改

- `pixelRatio: 3`、预览缩放控件、移动端「保存到相册」按钮、下载/分享逻辑、i18n key、observation 选择 UI 全保留。
- 颜色仍用现有 `ACCENT/INK/MUTED/PAPER` 常量，不引入新色。

## 涉及文件

- `src/components/ExportCardDialog.tsx`：替换第 513–712 行的离屏渲染 JSX。
