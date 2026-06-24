在 `src/components/SiteLayout.tsx` 调整移动端头部布局：

1. 第一排（移动端 `md:hidden` 区块，登录/我的 + 汉堡按钮所在行）中，在汉堡按钮前插入 `<LanguageToggle language={language} setLanguage={setLanguage} />`。
2. 第二排（快捷入口行）移除 `<LanguageToggle />`，仅保留「对象 / 热议议题 / 更多」。

桌面端保持不变。