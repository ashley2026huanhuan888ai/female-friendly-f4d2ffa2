新建 `src/components/FloatingHomeButton.tsx`：

- 一个固定定位（`fixed bottom-6 right-6 z-50`）的圆形按钮，使用 lucide `Home` 图标。
- 使用 TanStack `<Link to="/">`，`aria-label` 来自 `t("nav.home")`（若 i18n 无此键则添加：zh "首页" / en "Home"）。
- 当当前路径已是 `/` 时不渲染（通过 `useRouter` 读取 pathname）。
- 样式：`bg-foreground text-background shadow-lg hover:opacity-90`，尺寸 h-12 w-12。

在 `src/components/SiteLayout.tsx` 中 `<main>` 之后挂载 `<FloatingHomeButton />`，与 Toaster 同级，保证全站可见。

桌面与移动端共用，不与底部 `BackToHome` 冲突（BackToHome 是内联区块，浮动按钮是 FAB）。