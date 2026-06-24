# 手机端 Hero：用标签云替换「最新观察」

## 改动
仅修改 `src/routes/objects.$id.tsx` 的「最新观察」区块（约第 179–186 行）。

- **移动端（默认 / `md:hidden`）**：渲染标签云，使用已有的 `topTags`（含 `tag` 与 `count`），按 count 排序后映射到 4 档字号：
  - 最高频 → `text-2xl`
  - 第二档 → `text-xl`
  - 第三档 → `text-base`
  - 第四档 → `text-sm`
  
  字重也跟随递减（`font-semibold` → `font-normal`），颜色随热度变化（最高 `text-foreground`，最低 `text-muted-foreground`），点击跳转到 `/topics?tag=xxx`（保持与现有标签链接行为一致，如无则纯展示）。  
  顶部小标题改为 `objectDetail.topTags`。

- **桌面端（`hidden md:block`）**：保留现有「最新观察」段落不变。

- 若 `topTags` 为空，则移动端回退显示原「最新观察」文本，避免空白。

## 不做的事
- 不新增数据查询，不动 `topTags` 计算逻辑。
- 不改 hero 其它部分（标题、按钮、温度、案例时间线）。
- 不新增 i18n 键。
