# 导出卡片：多选合并长图

## 改动范围
仅修改 `src/components/ExportCardDialog.tsx` 与 `src/lib/i18n.tsx`，不涉及后端。

## 交互改动
1. **观察列表改为复选多选**：把现有 `<select>` 换成列表，每行带复选框；顶部加「全选 / 反选」。默认勾选第一条。
2. **每条单独配置**：勾选一条后，下方展开该条的配置块（包含截图开关 + 标签复选框），多条则按顺序堆叠各自的配置块，互不影响。
3. **校验**：未勾选任何观察、或所有勾选项都关闭了截图和原文时，禁用「生成长图」并 toast 提示。
4. **按钮文案**：根据勾选数量动态显示「生成长图（N 条）」。

## 长图结构
顶部统一 Header（对象类型 + 名称 + 档案编号）→ 依次渲染每条观察的 section：
- 截图（若勾选且存在）
- 触发点（勾选的 tags）
- 观察原文（summary + cleaned_content）
- 条目分隔线 + 该条 `created_at`

底部统一 Footer（导出时间 + 导出者昵称 + 品牌）。

## 技术要点
- 状态：`selectedIds: Set<string>` + `perItemConfig: Record<id, { includeScreenshot; includeContent; tags: Set<string> }>`，进入时按观察 tags 预填。
- 渲染：off-screen 容器宽度仍 1080px，循环 `selectedIds` 输出 section。
- 图片预检：对所有勾选且开启截图的 URL 并发 `new Image()` 预加载，失败的条目 toast 提示并中止。
- 文件名：`${object.name}-cards-${count}.png`。
- 新增 i18n 键：`export.selectAll` / `export.deselectAll` / `export.selectedCount` / `export.generateN`。

## 不做的事
- 不实现 zip、PDF、分页或后端导出。
- 不改导出按钮入口或对象详情页其他部分。
