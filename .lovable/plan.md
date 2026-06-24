## 目标
首页"近期升温"列表里的标签 chip 不再用芭比粉 `bg-accent`，改为跟同一行温度数字相同的色（`bandOf(temperature).color`，即 `--temp-warm/--temp-hot/...`），保持视觉一致。

## 改动
`src/routes/index.tsx`（ColumnList 内 tag 渲染处，约 407–418 行）：
- `import { bandOf } from "@/lib/temperature";`
- 在 map 外计算 `const tempColor = bandOf(Number(o.temperature_after ?? o.temperature ?? 0)).color;`
- 把 tag `<Link>` 的 className 中的 `border-accent bg-accent text-accent-foreground hover:bg-accent/90` 替换为 `border text-white hover:opacity-90`，并加 `style={{ backgroundColor: tempColor, borderColor: tempColor }}`。
- 文字保持白色以保证对比度（温度色为暖色，白字对比足够）。

只改这一处 tag；温度数字、标题、其他 accent 元素不动。

## 验证
preview 首页"近期升温"卡片：tag 颜色与右侧温度数字一致（65°C 红、60°C 橙），不再是粉色。
