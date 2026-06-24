## 问题
首页 `src/routes/index.tsx` 用 `useEffect + useServerFn(getHomeSummary)` 在客户端挂载后才拉数据，SSR 阶段第二/三屏（升温、最新 AI 观察、最新案例、话题墙）拿不到 `summary`，需等客户端 hydrate + RPC 往返完成才显示，肉眼可见"滞后"。

## 方案
切换到 TanStack Router + Query 的标准 loader 模式，让 SSR 直接带数据出 HTML：

1. `src/routes/index.tsx`
   - 新增 `homeSummaryQueryOptions = queryOptions({ queryKey: ["home-summary"], queryFn: () => getHomeSummary(), staleTime: 60_000 })`。
   - `Route` 增加 `loader: ({ context }) => context.queryClient.ensureQueryData(homeSummaryQueryOptions)`，并加 `errorComponent` / `notFoundComponent`（错误时回落到空 summary UI）。
   - 组件内用 `const { data: summary } = useSuspenseQuery(homeSummaryQueryOptions)` 替换 `useState/useEffect/useServerFn` 那一坨。
   - 移除 `obsStatus` 分支：loader 已保证 ready；保留"空状态"提示。错误重试改用 `router.invalidate()`（在 `errorComponent` 中）。
   - 顶部 import 增 `useSuspenseQuery, queryOptions`，去掉不再需要的 `useEffect/useState(summary)/useCallback/useServerFn` 引用。

2. 不修改 `getHomeSummary` 的实现与签名。

## 效果
- SSR HTML 已包含第二/三屏数据 → 首屏不再"延迟显现"。
- 60s `staleTime` 内导航回首页直接命中缓存。
- 仍保留搜索框 `q` 的 `useState`。

## 验证
preview 首页硬刷新：第二/三屏内容随首屏一起出现，无白屏闪烁；断网刷新触发 errorComponent。
