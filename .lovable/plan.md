## 问题
`facts` 字段在数据库中是 jsonb，可能为对象/字符串/null，不一定是数组，因此 `o.facts.map` 抛错。`o.facts?.length > 0` 的判断对非数组也可能为 truthy。

## 改动
1. `src/routes/admin.observations.tsx` 第 350-361 行：使用 `Array.isArray(o.facts) ? o.facts : []` 归一化后再渲染。
2. `src/routes/archive.$caseCode.tsx` 第 154 行同类问题，同样处理。

不改动后端 / 数据。