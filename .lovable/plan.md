## 个人观察台 — 导出图片功能

在 `/me` 页面顶部添加「导出图片」按钮，生成 640×自适应 PNG，风格沿用现有 `exportCanvas.ts`（米色底 #faf6ec、芭比粉 accent、Noto Serif SC 标题）。

### 卡片内容（自上而下）
1. Header：`MY OBSERVATORY / 个人观察台` + 用户头像 + 昵称
2. 数据条：`贡献温度 XX°` · `抵制 XX 次` · `等级 LX 称号`
3. 「我观察的标签」标题
4. 标签云：按数量降序，前 N 个加粗大字（参照截图样式：`女性工具化 ·61`），溢出自动换行
5. 底部：左侧 slogan「女性友好体验测评 / FEMALE EXPERIENCE ASSESSMENT」，右侧二维码（指向 `https://female-friendly.lovable.app/login?ref={invite_code}`）+ 一行小字「扫码加入 · 用我的邀请码 {CODE}」

### 实现
- 新文件 `src/lib/exportProfileCanvas.ts`：参照 `exportCanvas.ts` 的字体加载、Canvas 绘制、保存逻辑；新增 QR 绘制（用 `qrcode` 包，已安装则复用，否则 `bun add qrcode`）
- 新组件 `src/components/ExportProfileDialog.tsx`：预览 + 下载按钮（结构参考 `ExportCardDialog.tsx`）
- 新 server fn `getMyProfileStats`（`src/lib/api/contribution.functions.ts` 已有大部分，补一个聚合接口返回 `{ nickname, avatar_url, invite_code, points, level, level_title, boycott_count, tags: [{name, count}] }`）
- 在 `src/routes/me.tsx` header 区加按钮触发 dialog

### 验证
Playwright 移动端 390×745 截屏：打开 `/me` → 点导出 → 确认预览图标签清晰、QR 可扫、无遮挡。
