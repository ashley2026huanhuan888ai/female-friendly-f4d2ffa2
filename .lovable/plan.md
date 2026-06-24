# 手机端 Hero 排版重构

参考图右侧的草图调整 `src/routes/objects.$id.tsx` 的 hero 区域（仅 `md:` 以下）。

## 移动端新结构（自上而下）

1. **第一行**：对象标题（大号）左侧，温度数值「65°C」右侧贴边对齐（去掉温度计图形与「高温争议」标签，只保留数字+°C，红色）。
2. **第二行**：温度短描述（截断为 1 行，例如「温度越高，性别争议…」）左，「导出卡片」按钮右。
3. 删除 hero 顶部的「共 X 条已审核观察 · 综艺节目」小标签行（即图中划红线部分）。
4. 下方保留：描述（如有）、移动端标签云、「为什么这个温度？」入口、提交观察 / 已关注按钮组。

## 桌面端

`md:` 以上完全不变（标题大字 + 右侧温度计 + 现有元数据行保留）。

## 技术实现

- 把现有 hero 的元数据行（159–164 行）包成 `hidden md:flex`。
- 标题块改为 mobile grid：`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 md:flex md:flex-wrap`，右侧放手机版温度数字 `<span class="md:hidden font-serif text-3xl text-accent">65°<span class="text-xs">C</span></span>`。
- 「导出卡片」按钮从标题旁挪到新一行：mobile 与温度描述同行 `grid grid-cols-[minmax(0,1fr)_auto]`，桌面端按钮回到原位置（用 `md:hidden` / `hidden md:inline-flex` 双份渲染）。
- 温度描述文本沿用现有 `t("objectDetail.tempHint")` 或同等文案，移动端 `truncate text-sm text-muted-foreground`。
- 右侧温度计列（260–272 行）改为 `hidden md:flex`，避免移动端重复显示。

## 不做

- 不改温度数值/颜色逻辑，不动后端。
- 不改桌面端布局。
- 不改其它 section（案例时间线、所有已审核等）。
