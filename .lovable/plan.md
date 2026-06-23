让首页 hero 内的三步说明卡片可点击，整张卡片跳转到登录页 `/login`。

## 改动 `src/routes/index.tsx`
- 将三步 `<ol>` 内的 `<li>` 节点用 `<Link to="/login">` 包裹（每张卡片整块可点击），保留现有样式类。
- 增加 `hover:border-foreground transition-colors` 提示可点击；增加 `aria-label`（如 "前往登录页"）。
- 卡片宽度与排列不变（手机 3 列横排）。

不改 i18n、不动其它板块。