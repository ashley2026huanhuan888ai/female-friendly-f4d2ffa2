把导出卡片的标签样式改为与主页 `ObjectCard` 一致的**描边胶囊**风格（替代当前彩色纯文字）。

修改 `src/lib/exportCanvas.ts`：

1. `layoutTags` 在测量每个标签宽度时加入水平内边距（`tagPadX = 10`），让 `w` = 文本宽 + 2 × tagPadX，避免换行计算错位。
2. 绘制阶段（约 388-401 行）改为：
   - 计算每个标签矩形高度 ≈ `size + 12`（约 36–40px），垂直居中文本
   - `ctx.strokeStyle = MUTED_BORDER`（用 border 色，对应 `oklch(0.9 0.005 80)` 附近的浅描边）→ 用现有 `MUTED` 或新增常量 `BORDER`
   - `ctx.fillStyle = MUTED`（文字用 `muted-foreground`，不再用 `bandHex`）
   - `ctx.lineWidth = 1`，`ctx.strokeRect(tx, ty - rectH/2, w, rectH)`
   - 文本居中绘制（`textBaseline = "middle"`）
3. 行高 `TYPO.tagLH` 从 36 调到 ~42，给胶囊上下留呼吸；标签之间 `tagGapX` 保持 8–10。
4. `tagsH` 高度按新行高自动跟随，无需额外改测量。

视觉对齐参考 `src/components/ObjectCard.tsx:105`：`border border-border px-2 py-0.5 text-[11px] text-muted-foreground`。

不引入额外字体或颜色，仅复用 Canvas 端已定义的中性色常量。