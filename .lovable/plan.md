## 目标
手机端顶栏第二行直接平铺展开导航项，去掉汉堡菜单按钮。

## 改动（仅 `src/components/SiteLayout.tsx`）

1. **第二行结构改为横向滚动条**：将现有 `<div className="flex shrink-0 items-center justify-end gap-2 lg:hidden">` 改为占满整行的 `flex items-center gap-3 overflow-x-auto whitespace-nowrap text-xs lg:hidden`，启用横向触屏滑动以容纳所有项。
2. **平铺导航项**：在第二行依次渲染
   - `DESK_NAV`（desk 变体）或 `PRIMARY_NAV + SECONDARY_NAV`（默认变体）的所有链接，文字 `text-xs whitespace-nowrap`
   - 一个垂直分隔 `h-4 w-px bg-border`
   - 语言切换 `MobileLanguageButton`
   - 未登录显示 `登录/注册`；已登录显示 `我的`（带未读徽标）+ `退出`
   - 管理员显示 `管理` 链接
3. **删除汉堡按钮**：移除 `<button aria-label={t("nav.menu")} ...>` 及下方 `{menuOpen && (...)}` 移动展开抽屉块；同时移除 `menuOpen`/`setMenuOpen` state 与 useEffect 中的 setMenuOpen 调用。
4. 验证：Playwright 在 390×745 视口截图首页与桌面 1280 视口，确认手机端第二行所有导航可见（必要时可横滑），无横向溢出页面整体；桌面端布局保留 lg:flex 单行不变。

## 不动
- 桌面端 `lg:` 显示的主导航与右侧账号区
- Hero 缩放逻辑、其它路由与样式