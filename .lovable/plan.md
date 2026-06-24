# Hero 恢复左对齐

`src/routes/index.tsx` 第 66-100 行：
- 第 66 行：移除 `text-center` 和 `md:text-left`（始终左对齐）
- 第 71 行 h1：移除 `mx-auto`、`max-w-[20ch]`、`md:mx-0`、`md:max-w-none`
- 第 94 行 p：移除 `mx-auto`、`md:mx-0`（保留 `max-w-md md:max-w-2xl`，去掉冗余 `text-left`）

仅改对齐 class，不动文本与结构。
