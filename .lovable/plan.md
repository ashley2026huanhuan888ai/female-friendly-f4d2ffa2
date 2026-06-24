## 目标
删除导出对话框中每条观察下的「包含截图证据」勾选项，截图默认随观察一并导出（如果该条有截图）。

## 修改 `src/components/ExportCardDialog.tsx`
- 移除第 337-345 行 `includeScreenshot` 复选框 UI。
- `ItemConfig` 不再需要 `includeScreenshot`；将所有 `cfg.includeScreenshot && o.screenshot_url` 简化为 `!!o.screenshot_url`：
  - 第 139 行 `hasAny` 判断
  - 第 151 行渲染截图过滤
  - 第 679 行 `showShot`
- 初始化 configs（第 68-72 行）移除 `includeScreenshot` 字段。

## 可选清理
- `src/lib/i18n.tsx` 第 697、1456 行的 `export.includeScreenshot` 文案可保留（无引用不影响）或一并删除。

不改动其他逻辑（缩放、下载、QR、长图布局等）。
