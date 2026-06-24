## 改动
`src/routes/index.tsx` 第 411 行：将标签 className 由灰色边框改为粉色（accent）边框 + 粉色文字 + 浅粉底，hover 加深：

`border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/20`

仅改本页对象列表的标签样式，不动其他位置（HeatSources、ObjectTimeline 等）。