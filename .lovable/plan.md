## 根因
控制台显示两类错误：

1. `SecurityError: Failed to read 'cssRules'` — html-to-image 试图把 Google Fonts 样式表内联进 SVG，浏览器拒绝读取跨域 stylesheet。这条只是 warning，库内部 catch 了，不致命但拖慢且刷屏。
2. `{isTrusted: true}` 的 Event 抛到 handleExport 的 catch 里 — 来自 html-to-image 内部 `embedImages` 拉取观察截图时失败。原因：截图 `<img>` 设置了 `crossOrigin="anonymous"`，但远端图片响应没有 CORS 头（或 fetch 模式不一致），导致内联失败 + canvas 污染，整个 `toPng` 抛错 → toast「生成失败」。

## 修复
改 `src/components/ExportCardDialog.tsx`：

### 1. 关掉字体内联
`toPng(..., { skipFonts: true })`。卡片现用 `ui-serif / Songti SC / system-ui` 系列，渲染时浏览器已加载，PNG 中保留同名字体即可，不需要把 Google Fonts CSS 嵌进 SVG。消除 SecurityError 噪音并显著加速。

### 2. 截图本地化（避开 html-to-image 的跨域抓取）
在 `handleExport` 调 `toPng` 之前，把每张 `screenshot_url` 用 `fetch(url).then(r => r.blob())` 转成 `URL.createObjectURL(blob)`，把 off-screen `<img>` 的 `src` 替换为 blob URL；blob URL 同源、无 CORS 限制。
- 拉取失败的那条：跳过该截图（不致整张图失败），并 toast 提示「部分截图未能加载」。
- 完成后 `URL.revokeObjectURL` 回收。

实现要点：
- 新增 `screenshotBlobUrls: Record<observationId, string>` state，由 `handleExport` 开始时填充，渲染分支用 `blobUrls[o.id] ?? o.screenshot_url` 决定 `<img src>`。
- 旧的 `Image()` probe + `crossOrigin='anonymous'` 改为 fetch blob 路径，复用进度阶段 `progressImages`。

### 3. 错误日志可读
`catch (e)` 里 `console.error('[ExportCard] toPng failed', e)`，避免日志只剩 `{isTrusted:true}` 不知所云。

不改：缩放、进度条、pixelRatio 自适应、UI 文案。
