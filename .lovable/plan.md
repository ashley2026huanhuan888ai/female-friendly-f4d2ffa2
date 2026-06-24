# 简化语言切换按钮

把现有的「中文 / EN」双按钮组改成单按钮：显示的是「另一种语言」，点击即切换。

## 改动 `src/components/SiteLayout.tsx`

- 找到现有语言切换的两个按钮（中文 / EN）。
- 替换为单个按钮：
  - 当前 `language === "zh"` → 按钮文字 `EN`
  - 当前 `language === "en"` → 按钮文字 `中文`
- 点击调用 `setLanguage(language === "zh" ? "en" : "zh")`。
- 样式：保留外层细边框 + 紧凑 padding（`border border-border px-2 py-1 text-xs hover:bg-foreground hover:text-background`），无背景填充，去掉分段选中态。
- `aria-label` 设为「Switch to English / 切换为中文」。

## 不做

- 不改 i18n 逻辑、不改持久化方式。
- 桌面/移动端共用同一按钮。
