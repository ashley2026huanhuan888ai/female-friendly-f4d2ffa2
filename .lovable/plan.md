在 `src/components/ExportCardDialog.tsx` 中给「选择要导出的观察记录」区域加上**可折叠**能力，并在卡片生成成功后**自动收起**：

1. 新增本地状态 `const [selectionOpen, setSelectionOpen] = useState(true)`。
2. 修改现有标题行（约第 324-335 行）：
   - 整行改为按钮（`<button onClick={() => setSelectionOpen(v => !v)}>`），左侧文案保留 `选择要导出的观察记录 (x/N)`，右侧加一个 `▾/▸` 指示符；
   - 「全选 / 全不选」按钮单独保留在右侧（用 `stopPropagation`）。
3. 列表本体（约第 337-404 行的 `<div className="divide-y …">`）仅在 `selectionOpen` 为 true 时渲染。
4. 在 `handleExport` 成功调用 `setResult({...})` 之后（约第 217 行）增加 `setSelectionOpen(false)`，实现「生成成功后自动收起」。
5. 在「重新生成」按钮 `onClick={() => setResult(null)}`（约第 496 行）中同时 `setSelectionOpen(true)`，方便用户调整后重新导出。

仅前端 UI 行为，无样式系统/状态架构调整。