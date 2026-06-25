## 目标
在管理后台 `/admin/observations`「观察审核 · AI 风险与分析面板」顶部筛选条增加搜索框，按关键字过滤观察记录。

## 搜索范围
对每条观察按关键字（不区分大小写）匹配以下字段：
- 观察正文 `content`
- 关联对象名称 `objects.name`
- AI 解释 `explanation`
- 标签 `tags`

## 后端改动
`src/lib/api/platform.functions.ts` 的 `adminListObservations`：
- 入参增加 `q: z.string().trim().max(100).optional()`
- 当存在 `q` 时，使用 `.or(...)` 在 `content`、`explanation` 上做 `ilike` 模糊匹配；对象名匹配通过 `objects!inner(id,name)` + `.ilike("objects.name", ...)` 合并实现（拆成两次查询合并去重，避免 PostgREST `or` 跨表语法限制）。
- 标签匹配：附加 `.contains("tags", [q])` 的并集查询。
- 三路查询结果在服务端合并去重，按 `created_at desc` 截到 `limit`。

## 前端改动
`src/routes/admin.observations.tsx`：
- 新增 `const [keyword, setKeyword] = useState("")` 与一个 300ms 防抖的 `debouncedKeyword`。
- 在状态/风险筛选条同一行尾部加入搜索 `<input>`（占位「搜索内容、对象、标签…」，回车或防抖触发）和「清除」按钮。
- `reload()` 把 `q: debouncedKeyword || undefined` 传入 `listObs`，`useEffect` 依赖加入 `debouncedKeyword`。
- 无结果时显示「没有匹配的观察」。

## 不改动
- 其他列表交互、批量审核、AI 重算、删除等逻辑保持不变。
- 不引入新依赖、不新增表/迁移。
