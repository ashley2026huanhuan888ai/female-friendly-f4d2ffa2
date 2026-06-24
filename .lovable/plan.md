## 目标
对导出卡片全链路（打开对话框 → 预览缩放交互 → 生成长图）做一次客观的流畅度采样，输出量化指标和瓶颈定位，再决定是否优化。

## 测量步骤（Playwright + CDP，全部在沙箱中执行，不改产品代码）

脚本写在 `/tmp/browser/export-perf/run.py`：

1. 登录态注入 → 打开任意带观察记录的对象页（例如当前 `/objects/ae138077-...`）。
2. 启动 CDP Performance + Tracing（`Page.startScreencast` + `Tracing.start` `categories: devtools.timeline, blink.user_timing`），并打开浏览器 FPS meter (`Overlay.setShowFPSCounter`)。
3. **场景 A — 打开对话框**：点击「导出长图」按钮，记录从 click 到对话框首帧绘制（`requestAnimationFrame` + `performance.now()` 注入），以及离屏卡片首次完成 layout 的耗时。
4. **场景 B — 预览缩放交互**：连续拖动 zoom 滑块 0.5 → 1.5 共 20 次，采样 `requestAnimationFrame` 间隔统计平均 FPS、p95 帧时间、长任务数（PerformanceObserver `longtask`）。
5. **场景 C — 生成长图**：勾选 3 条观察，点击「生成」，用 `performance.mark` 包裹 `html-to-image` 调用，记录：DOM 准备耗时、`toPng` 耗时、Blob/DataURL 大小、主线程阻塞时长（CDP `Performance.metrics` 前后差值）。
6. 导出 trace 到 `/tmp/browser/export-perf/trace.json`，截图关键节点到 `screenshots/`。
7. 解析 trace，打印汇总表：场景、总耗时、平均 FPS、p95 帧时间、长任务总时长、主要耗时函数 top 5。

## 判定标准
- 流畅：交互期间 p95 帧 < 32ms（≥30FPS），无 > 200ms 长任务。
- 生成长图：3 条观察 + 截图，pixelRatio=3，总耗时 < 3s 视为可接受；>5s 建议优化。

## 后续（仅在本次测量数据支持时）
若指标不达标，再单独提一份优化方案候选：
- 预览缩放改用 CSS `transform: scale()` 而非重渲染（如当前未用）。
- 离屏卡片在 dialog 关闭时卸载，避免常驻 DOM。
- `html-to-image` 改为按需懒加载 + `pixelRatio` 自适应屏幕 dpr。
- 长截图分块绘制 + `OffscreenCanvas`。

本计划本身不改任何产品代码，只产出测量报告。
