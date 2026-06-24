在 `src/routes/index.tsx` 的 Hero 区域（首屏 `<section>` 容器）调整移动端排版，使其更居中、紧凑、视觉平衡：

修改点（仅影响 `< md` 屏幕，桌面端保持不变）：

1. 外层 `container-prose grid ... pt-6 pb-12 md:pt-10 md:pb-16`
   - 移动端增加上下留白与水平对齐：改为 `gap-8 pt-10 pb-14 text-center md:text-left md:gap-10 md:pt-10 md:pb-16`。
2. 顶部小标签 `Observatory · Est. 2026`
   - 添加 `mx-auto md:mx-0 inline-block`，并将 letter-spacing 在移动端略减小（`tracking-[0.18em] md:tracking-[0.2em]`）。
3. `<h1>` 标题
   - 移动端字号过大，改为 `text-4xl md:text-7xl`，行高 `leading-[1.1]`，并加 `mx-auto max-w-[20ch] md:mx-0 md:max-w-none`。
4. 三步引导 `<ol>`
   - 改为 `mt-6 gap-3 md:mt-8`，并加 `text-left`（卡片内文字保持左对齐，避免居中时混乱）。
5. 描述段 `<p>`
   - `mt-6 mx-auto max-w-md text-sm md:mt-8 md:max-w-2xl md:text-base md:mx-0 text-left`。
6. 搜索表单 `<form>`
   - 加 `mx-auto md:mx-0 w-full max-w-sm md:max-w-lg mt-8 md:mt-10`。
7. 底部按钮组 `<div className="mt-6 flex flex-wrap gap-3">`
   - 改为 `mt-6 flex flex-wrap justify-center gap-3 md:justify-start`。

不修改右侧栏与下方区块、不调整桌面端布局。