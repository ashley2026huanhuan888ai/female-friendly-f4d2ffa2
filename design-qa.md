# 首页桌面档案首屏 QA

final result: blocked

## Source Visual

- 目标方向：深色桌面背景 + 第一屏叠纸构图 + 表单作为斜放档案纸 + 温度模块作为独立判定纸条。
- 参考图：`/Users/ashleyai/.codex/generated_images/019ec93c-389e-7372-9807-5087657b4846/ig_0853fd0c02c942dc016a30c9c9329881919202afde6f7a282e.png`

## Implemented Screen

- 路由：`/`
- 本地预览：`http://localhost:8081/`
- 改动范围：仅首页首屏、首页专用导航外观、首页桌面纹理资产。

## Verification Evidence

- `npm run check:types` passed.
- `npx eslint src/components/SiteLayout.tsx src/routes/index.tsx` passed.
- `npm run build` passed.
- 构建产物确认首屏桌面纹理为 JPEG，约 400KB：`archive-desk-texture-*.jpg`。
- 首页文案扫描无 `截图`、`screenshot`、`upload`、`上传`、`图片` 残留。

## Visual QA Status

自动截图对照被当前 macOS/沙盒权限阻断：

- `screencapture -x /private/tmp/female-friendly-home-desk.png` 返回 `could not create image from display`。
- 因此无法在本环境里生成“参考图 vs 实际页面截图”的同屏对照。

## Manual Review Checklist

- 首页第一屏应显示深色桌面背景，而不是干净白色网页背景。
- 顶部导航在首页应变成暗色弱化导航；其他页面仍保持原导航。
- 首屏应包含横向档案页眉纸条。
- 左侧主标题应在大档案纸上，而不是独立网页文案区。
- 右侧提交表单应作为斜放档案纸出现。
- 温度判定应作为独立纸条压在表单纸附近。
- 移动端应退化为纵向纸张流，不出现横向滚动。

## Remaining P2/P3 Risks

- 视觉是否足够接近参考图仍需人工看浏览器页面确认。
- 如果要更强的真实纸边和磨损，下一轮可再增加独立纸纹/污损遮罩资产。
