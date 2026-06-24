## 目标
在导出长图完成后，提供清晰的下载反馈与一键分享入口。

## 改动点（仅 `src/components/ExportCardDialog.tsx`）

1. **生成结果状态**：新增 `result: { dataUrl, filename, blob } | null`。`handleExport` 不再立即触发 `<a download>`，而是生成完毕后把结果存入 state，并 `toast.success`。

2. **文件名规范化**：`${object.name}-${YYYYMMDD}-${count}cards.png`，把对象名里非法字符替换为 `_`。

3. **结果面板**（替换原"生成"按钮区域，仅当 `result` 存在时显示在底部）：
   - 显示缩略图（max-h 160px）
   - 显示完整文件名（mono 字体，可点击复制）
   - 三个按钮：
     - **下载 PNG**：触发 `<a href=dataUrl download=filename>`
     - **分享**：优先调用 `navigator.share({ files:[File], title, text })`（Web Share Level 2）；不支持文件分享时回退到复制图片到剪贴板（`navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`）；都不支持就 toast 提示"长按图片保存"。
     - **重新生成 / 关闭**

4. **i18n 新增键**（中/英）：
   - `export.ready` "长图已生成" / "Image ready"
   - `export.download` "下载 PNG" / "Download PNG"
   - `export.share` "分享" / "Share"
   - `export.shareUnsupported` "当前设备不支持直接分享，已复制到剪贴板" / "Sharing not supported, copied to clipboard"
   - `export.copyFailed` "复制失败，请长按图片保存" / "Copy failed, long-press the image to save"
   - `export.regenerate` "重新生成" / "Regenerate"
   - `export.filename` "文件名" / "Filename"

5. **关闭对话框时**清空 `result`，避免下次打开看到上次结果。

## 验收
- 点击"生成长图"→ 出现结果面板，含缩略图、文件名、下载/分享/重新生成按钮。
- 下载按钮在桌面/移动端均生效。
- 移动端 Safari/Chrome 点"分享"调起系统分享面板；不支持时降级到剪贴板或提示。
- 切换观察项或关闭重开后，旧结果被清空。

不涉及任何后端、路由或其他组件改动。