## 目标
提升手机端"最新观察"区域可读性，并删除温度计下方的细分隔线。

## 调整（`src/routes/objects.$id.tsx` 头部区块）

1. 温度计行去掉 `border-b border-border/60 pb-3`，保留 `md:` 重置类一并删除。
2. "最新观察" 区块：
   - 包裹容器加 `rounded-sm bg-card/40 px-4 py-5 md:bg-transparent md:px-0 md:py-0`，给手机端一个轻微的卡片背景与上下内边距，提升可读性。
   - 正文 `text-base` → 手机 `text-[15px] leading-7`，桌面保持 `md:text-base md:leading-relaxed`。
   - 标签与正文间距 `mt-2` 保持。
3. 手机端 `mt-6` 调整为 `mt-4`，避免与新增内边距叠加过空。

不动文案、组件结构、桌面端样式。