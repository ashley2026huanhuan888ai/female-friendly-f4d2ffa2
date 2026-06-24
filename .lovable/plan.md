## 目标
按截图反馈调整导出长图 header 与截图区，让"温度"和"二维码"上移到标题区，并彻底删除无附件占位。

## 改动（仅 `src/components/ExportCardDialog.tsx` 的 off-screen 渲染部分）

### 1. Header 重排
当前：温度在第二行右侧、档案编号孤立在右上、二维码在卡片底部。
改为单个 header 区，CSS grid 三列：

```
左列（auto, 主区）        |  中列（auto, 温度）  |  右列（auto, 二维码）
女性友好体验存档              [温度数值 + °C]       [80×80 QR]
Female-Friendly Archive       区间色字            档案入口（小字）
影视作品                      ─────              ─────
父母爱情（大字）              档案编号小字 mono     扫码查看（小字）
```

具体：
- 外层 flex，`alignItems: flex-start, gap: 32, justifyContent: space-between`
- 左列：标题块（30px bold）+ 副标题 + 间距 16 + 类型小标签 + 对象名（46px bold）
- 中列：80×120 块，上方"温度"小标 uppercase，下方 `<温度数值 64px tempBand.color> °C`，下方档案编号 mono 小字
- 右列：100×120 块，QR 图 96×96 + 下方两行 12px "档案入口 / 扫码查看完整档案"
- 整 header 下方 1px 黑线分割

### 2. 删除底部独立的 QR 区块（已移至 header）

### 3. 截图区
确认：当 `cfg.includeScreenshot && !obs.screenshot_url` 时不渲染任何 dashed 占位（当前代码已正确，再次复核 + 截图区外不要任何 fallback DOM）。同时把"包含截图证据"开关在无附件时强制 `includeScreenshot=false`，避免历史 state 残留。

### 4. 档案编号位置
从中列底部展示（mono 13px），不再单独占右上角；视觉重心交给温度数字。

## 验收
- 顶部一行内同时看到：标题块 / 温度 / 二维码 三块。
- 没有附件的观察 → 截图区不出现任何虚线框或"无附件证据"文字。
- 整体保持原有正文卡片、footer 不变。

不涉及业务逻辑或 i18n。