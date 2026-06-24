## 目标
确保每个对象的"抵制"按钮都已实现并可用。

## 现状
- `ObjectCard`（用于 `/objects` 列表与 `/topics/$tag`）已在温度计下方渲染 `BoycottButton`。
- **缺失**：对象详情页 `src/routes/objects.$id.tsx` 没有抵制按钮，只有"提交观察"和"关注"。

## 修改
在 `src/routes/objects.$id.tsx` 第 298–307 行的操作行中，于 `FollowButton` 旁追加 `<BoycottButton objectId={id} />`，并在文件顶部 import。

不改后端、不改 `BoycottButton` 自身样式与逻辑。