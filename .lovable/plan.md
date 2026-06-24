# 近期争议对象列表布局调整

`src/routes/index.tsx` 第 391-429 行（`ColumnList` 内列表项）。

## 改动

把每项从「左温度 + 右内容」改为「左内容（多行） + 右大号温度」：

```tsx
<li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3">
  <div className="min-w-0">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {objectType(o.type)}
    </div>
    <Link to="/objects/$id" params={{ id: o.id }} className="block font-serif hover:text-accent">
      {o.name}
    </Link>
    {/* tags 同前 */}
    <Link
      to="/objects/$id"
      params={{ id: o.id }}
      className="mt-1 block max-w-[28ch] text-xs leading-5 text-muted-foreground hover:text-foreground"
    >
      {detail}
    </Link>
  </div>
  <Link to="/objects/$id" params={{ id: o.id }} className="shrink-0">
    <Thermometer value={o.temperature} size="lg" showLabel={false} />
  </Link>
</li>
```

要点：
- 温度移到右侧、`size="lg"`（已有 `text-4xl`）
- 名称去掉 `truncate`，允许折行
- 详细文案加 `max-w-[28ch]`，强制多行、右侧留空
- 不动其它区块、文案、i18n

## 强调温度

`src/components/Thermometer.tsx` 第 41 行：给数字加 `font-bold`：
`className={\`font-serif font-bold tabular-nums ${numCls}\`}`

不影响小尺寸/其它使用场景的视觉过强（仍由 size 控制字号；加粗在所有场景增强即可，符合"强调温度"诉求）。
