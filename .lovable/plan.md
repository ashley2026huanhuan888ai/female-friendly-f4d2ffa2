# 发布提交号自动校验

由于 Lovable 顶栏的 Publish 按钮本身无法拦截，方案是在应用内提供一个"发布校验中心"，把发布前比对和发布后核对都自动化；用户从这个页面发起发布，全流程被覆盖。

## 1. 把 commit 号注入运行时

- 在 `vite.config.ts` 通过 `define` 注入两个常量：`__APP_COMMIT__`（`git rev-parse HEAD`）和 `__APP_BUILT_AT__`（ISO 时间）。构建时执行，preview / production 各自带自己的值。
- 新建 `src/lib/build-info.ts` 统一导出 `APP_COMMIT` / `APP_BUILT_AT`。

## 2. 暴露 commit 号

- **HTML meta**：在 `src/routes/__root.tsx` 的 `head().meta` 追加 `{ name: "app-commit", content: APP_COMMIT }` 和 `app-built-at`，方便人工 View Source 或外部抓取。
- **公共端点**：新建 `src/routes/api/public/version.ts`（TanStack server route），`GET` 返回 `{ commit, builtAt, deployment }`。无敏感数据，可被 CORS 公开访问。

## 3. 校验逻辑

新建 `src/lib/api/publish-check.functions.ts`（`createServerFn`，免鉴权读取即可，或加 admin 校验）：

- `comparePreviewProduction()`：服务端并行 fetch
  - `https://id-preview--521cf5fe-...lovable.app/api/public/version`
  - `https://female-friendly.lovable.app/api/public/version`
  - 返回 `{ previewCommit, productionCommit, match }`。
- `waitForProductionCommit(targetCommit)`：轮询生产端点，最多 ~3 分钟，命中即返回成功。

## 4. 发布校验页 `/admin/publish`

新建 `src/routes/admin.publish.tsx`（受现有 admin 布局保护）：

```text
┌─ 当前预览 commit:  abcdef1  (built 2026-06-16 10:20)
├─ 当前生产 commit:  9988776  (built 2026-06-15 22:00)
├─ 状态: ❌ 不一致 / ✅ 一致
│
├─ [ 重新检查 ]   [ 打开 Lovable Publish 对话框 ]
│
└─ 发布后核对：
   目标 commit: abcdef1
   轮询状态:   ⏳ 等待生产返回 abcdef1 …
              ✅ 已部署 (用时 47s)
```

行为：
1. 进入页面自动调用 `comparePreviewProduction()` —— 发布前的"自动校验"。
2. 若不一致，提示"生产落后于预览，建议立即 Publish"；点击主按钮提示用户在右上角点 Publish（Lovable UI 无 API 可程序化触发）。
3. 用户发布后页面自动启动 `waitForProductionCommit(previewCommit)` 轮询；命中即显示绿色成功，并记录耗时。

## 5. 自动入口

- 在已有 `src/routes/admin.index.tsx` 顶部加一个常驻条幅：发现 preview ≠ production 时显示"⚠ 预览有未发布的更改，前往发布校验"并链接到 `/admin/publish`，确保每次进入 admin 都会被提醒。

## 技术要点

- `define` 用 `JSON.stringify` 包裹字符串，否则 Vite 会注入裸标识符导致构建失败。
- `/api/public/version` 必须在 `api/public/` 下，published 站点才会跳过鉴权；handler 中显式加 `Access-Control-Allow-Origin: *` 以便前端跨预览/生产 fetch。
- 轮询端点放在服务端（serverFn）而不是浏览器，避免 CORS 与本地缓存问题；前端只 `useQuery({ refetchInterval })`。
- 不修改 `src/integrations/supabase/*` 与 `src/routeTree.gen.ts`。

## 不在范围

- 无法真正"拦截"顶栏 Publish 按钮（那是 Lovable 平台行为）。本方案通过把发布动作引导到 `/admin/publish` 页来达成"每次 Publish 都自动校验"的目标。
