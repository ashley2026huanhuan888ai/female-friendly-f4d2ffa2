问题原因：当前 `src/server.ts` 还没有把发布环境里的后端变量同步到 SSR 可读的 `process.env`，也没有把公开配置注入到浏览器端；同时 `src/integrations/supabase/client.ts` 只读取了部分变量名，所以发布站点 SSR 仍会抛出 `Missing Supabase environment variable(s)`。

计划只做这几项：

1. 修复对象列表路由结构
   - 将 `src/routes/objects.tsx` 重命名为 `src/routes/objects.index.tsx`。
   - 将其中 `createFileRoute("/objects")` 改为 `createFileRoute("/objects/")`。
   - 保持 `src/routes/objects.$id.tsx` 为 `createFileRoute("/objects/$id")`。
   - 保持 `ObjectCard` 使用 `<Link to="/objects/$id" params={{ id }}>`。

2. 修复发布环境变量同步
   - 在 `src/server.ts` 添加 `syncRuntimeEnv(env)`。
   - 在每次请求进入 TanStack SSR 前，把运行时提供的：
     - `SUPABASE_URL`
     - `SUPABASE_PUBLISHABLE_KEY`
     - `SUPABASE_ANON_KEY`
     同步到 `globalThis.process.env`。

3. 注入浏览器端公开配置
   - 在 `src/server.ts` 添加 `injectPublicSupabaseConfig(response)`。
   - 对 HTML 响应注入：
     - `window.__FF_SUPABASE_CONFIG__.url`
     - `window.__FF_SUPABASE_CONFIG__.anonKey`
   - 这样浏览器端即使没有 build-time `VITE_*` 变量，也能拿到公开配置。

4. 扩展 Supabase client 读取顺序
   - 更新 `src/integrations/supabase/client.ts`，支持以下全部变量名：
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_ANON_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_PUBLISHABLE_KEY`
     - `SUPABASE_ANON_KEY`
   - 浏览器优先读取 `window.__FF_SUPABASE_CONFIG__`，再读 `import.meta.env`，最后 SSR 读 `process.env`。

5. 验证
   - 检查 `/objects` 可访问。
   - 检查对象卡片进入 `/objects/$id`。
   - 检查 `/`、`/login`、`/objects` 不再出现缺失环境变量错误。
   - 完成后需要重新发布/更新发布站点，`https://female-friendly.lovable.app/` 才会使用新代码。

不会做：数据库 migration、提交额度、权限策略或其它业务逻辑改动。