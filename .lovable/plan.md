## 在对象详情页增加「导出卡片」功能

### 入口
- 在 `src/routes/objects.$id.tsx` 对象名（`<h1>{obj.name}</h1>`）旁边新增「导出卡片」按钮，移动端图标 + 文字，桌面端紧贴标题右侧。

### 导出弹窗（新建 `src/components/ExportCardDialog.tsx`）
- 打开后展示该对象的全部观察列表（复用 `obs`）。
- 顶部说明 + 单条选择（每次导出一条观察）。也可以多选；先实现「选定一条观察 → 配置导出内容」。
- 配置区：
  - 是否包含截图（默认开，若该 observation 有 `screenshot_url`）。
  - 标签勾选：默认全选该 observation 的 `tags`，用户可取消勾选。
  - 是否包含观察原文（默认开，使用 `cleaned_content || content`）。
- 「生成长图」按钮 → 触发 html-to-image 渲染。

### 卡片结构（离屏 DOM，固定宽 1080px）
单张竖向长图，上下两块拼接，整体风格沿用站点的报纸/档案风（serif 标题 + 边框 + 红色 accent）：

1. **上半部分（第 1 页）**：
   - 截图证据全幅显示（`screenshot_url`），按宽度自适应高度。
   - 若无截图：使用对象名 + 温度计 + 「无附件证据」占位卡。
   - 顶部 badge：对象名 + 类型。

2. **下半部分（第 2 页）**：
   - 「触发标签」：勾选过的 tags 渲染为带 ☑ 的方框列表（仿用户上传的检查表风格）。
   - 「观察原文」：cleaned_content / content 全文，serif 字体。
   - 可选 summary（如有）置顶为引言。

3. **底部 footer**（贯穿整张图底端）：
   - 时间：observation 的 `created_at`，按当前语言 `formatDateForLanguage` 格式化。
   - 用户昵称：登录用户的 nickname（从 `useAuth()` / 当前 profile 取，未登录显示「匿名」）。
   - 站点标识：`女性友好体验测评 · Female-Friendly Experience Archive` + 档案编号 `FF-2026-<obj.id 前 6 位>`。

### 生成图片
- 依赖：`bun add html-to-image`。
- `toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })` → 触发 `<a download>` 保存 `${obj.name}-${observationId}.png`。
- 截图为跨域时（Supabase storage）需 `crossOrigin: 'anonymous'`；通过 `<img crossorigin="anonymous">` 加载并等待 `onload` 后再 toPng，避免画布污染。

### i18n
- 新增 key：`export.button` / `export.title` / `export.selectObservation` / `export.tags` / `export.includeScreenshot` / `export.generate` / `export.exportedBy` / `export.archivedAt` / `export.anonymous` / `export.noScreenshot`。中英文都加。

### 涉及文件
- 新建：`src/components/ExportCardDialog.tsx`
- 修改：`src/routes/objects.$id.tsx`（按钮 + 弹窗挂载）
- 修改：`src/lib/i18n.tsx`（翻译 key）
- 新增依赖：`html-to-image`

不改后端、不动数据库。