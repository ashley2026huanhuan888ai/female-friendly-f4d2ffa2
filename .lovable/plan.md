执行计划：

1. 补丁文件处理
- 当前沙盒无法读取你给的本机路径 `/Users/ashleyai/Documents/agents/female-friendly-lovable-minimal-two-issue-fix.patch`。
- 我会按它描述的目标做等价最小修复；如果你必须逐行套用补丁，请先把 patch 文件上传到项目。

2. 修复 `/objects` 卡片跳转
- 只改 `src/components/ObjectCard.tsx`。
- 将对象卡片和“查看详情”的普通 `href` 跳转改为 TanStack Router 的类型安全跳转：`to="/objects/$id"` + `params={{ id }}`。
- 不改详情页业务逻辑、不改列表查询、不改数据库。

3. 修复环境变量报错
- 只围绕前端/backend 客户端初始化修复 `Missing ... environment variable(s)`。
- 避免客户端依赖不稳定的 `process.env` 读取，优先使用 Vite 注入的公开变量，并保留服务端可用的安全 fallback。
- 不新增提交额度、不新增 migration、不改权限策略、不改无关功能。

4. 验证
- 访问 `/objects`，确认对象卡片点击进入 `/objects/$id`。
- 访问 `/login` 和 `/`，确认不再出现环境变量缺失报错。