# 全局点按互动 → 芭比粉

在 `src/styles.css` 的 `@layer base` 内加入全局 `:active` / `:focus-visible` 规则，覆盖所有可交互元素（`a`, `button`, `[role="button"]`, `summary`, `label`, `input[type="checkbox"]`, `input[type="radio"]`），按下时显示芭比粉反馈：

```css
@layer base {
  a:active,
  button:active,
  [role="button"]:active,
  summary:active,
  label:active {
    color: var(--color-accent);
  }
  a:focus-visible,
  button:focus-visible,
  [role="button"]:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  ::selection {
    background: color-mix(in oklab, var(--color-accent) 35%, transparent);
    color: var(--color-foreground);
  }
}
```

只加规则，不动其它样式与组件。
