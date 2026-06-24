# 强化主色为芭比粉

将当前深红 accent 与黑色 CTA 全部改为芭比粉（Barbie pink，#E0218A 系），加强视觉表现。

## src/styles.css
- `--accent: oklch(0.65 0.27 350);`（替换原 `oklch(0.55 0.18 25)`）
- `--ring: oklch(0.65 0.27 350);`
- `--destructive` 保留不变（语义不同）

→ 标题强调字 `女性 / 体验`、步骤编号 `01/02/03` 自动变芭比粉。

## src/routes/index.tsx
将两个黑底 CTA 改为芭比粉底：
- 第 114 行「查询」按钮：`bg-foreground … hover:bg-accent` → `bg-accent text-accent-foreground hover:bg-accent/90`
- 第 121 行「大家在观察的性别争议对象」：`border-foreground bg-foreground … hover:bg-accent hover:border-accent` → `border-accent bg-accent text-accent-foreground hover:bg-accent/90`

不动其它文案、布局、其它路由的按钮样式。
