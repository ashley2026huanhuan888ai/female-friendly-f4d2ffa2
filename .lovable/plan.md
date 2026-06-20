## 目标
手机端顶部导航空间不足，品牌名 "女性友好体验监测站" 被截成 "女性友好体…"。改为两行布局，让品牌名完整显示。

## 改动范围
仅 `src/components/SiteLayout.tsx` 的 `<header>` 内的容器，桌面 (`lg:`) 保持单行不变。

## 具体改动
1. 把 `container-prose flex h-16 items-center justify-between gap-3` 改为：手机端 `flex-col items-stretch gap-2 py-2 h-auto`，`lg:` 还原为 `lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-0`。
2. 品牌 `<Link>` 行：手机端单独一行，去掉 `truncate`，允许 `whitespace-nowrap` 完整显示；保留 `lg:min-w-fit`。
3. 右侧操作组 `<div className="flex shrink-0 items-center gap-2 lg:hidden">`：改为 `justify-end` 占满第二行宽度。
4. 验证：Playwright 在 390×745 视口截图 `/` 顶栏，确认品牌名完整、第二行操作按钮齐全、无横向溢出。

## 不动的部分
- 桌面端布局
- Hero scene 缩放逻辑（之前已基于视口宽度自适应）
- 其它路由与样式