## 目标

整卡可点击 **不能以删内容为代价**。本次只做"审计 → 最小修复 → 信息恢复"，不做视觉重构。

## 一、只读审计结果

| 文件 | 卡片位置 | 现状 | 问题 |
|---|---|---|---|
| `src/components/ObjectCard.tsx` | `/objects` 列表唯一复用项 | 整张 `<Link>`，只有 type / name / ai_summary / observation_count / 温度 | **字段被精简**：缺 top_tags、heat/cooling 摘要、最新更新时间、关注/提交快捷操作 |
| `src/components/FeedEventCard.tsx` | 首页"最新观察事件" | 整张 `<Link>` | 需确认是否还保留事件 delta、原因 |
| `src/routes/index.tsx` L137-152 | 首页"新加入测评对象" | 行式 `<Link>`，仅温度+类型+名称+计数 | 信息精简但语义可接受 |
| `src/routes/index.tsx` L286-305 `ColumnList` | 升温/降温榜 | 行式 `<Link>` | OK |
| `src/routes/topics.$tag.tsx` L71-86 | 标签页"相关对象" | 整张 `<Link>` | 只有类型+名称+温度，**缺 ai_summary / tags / 观察数** |
| `src/routes/me.tsx` L86, L122, L159 | 个人中心收藏/关注/通知 | 整张 `<Link>` | 需检查是否有内部按钮被剥离 |
| `src/routes/discussions.tsx` L43 | 讨论列表 | 整张 `<Link>` | 同上 |
| `src/routes/archive.$caseCode.tsx` L54 | 案例关联对象 | 行内 `<Link>`（文本链接） | OK |
| `src/routes/objects.tsx` 搜索结果 | 复用 `ObjectCard` | — | 跟随 ObjectCard 修复 |
| `src/routes/admin.objects.tsx` / `admin.observations.tsx` / `admin.bulk-import.tsx` | 后台表格 | 文本 `<Link>` | OK，无需改 |

**核心问题：**
1. `ObjectCard` 被砍到只剩 5 个字段，导致 `/objects` 列表和搜索结果"内容变少"
2. `topics.$tag.tsx` 相关对象卡是内联实现，没复用 `ObjectCard`，且也缺信息
3. 几处页面（首页/me/discussions）已经是"整张 `<Link>`"，但因此无法承载内部按钮（关注、提交观察）—— 信息没删，但**操作按钮被剥离**

## 二、修复方案（最小改动）

### 1. 恢复 `ObjectCard` 字段
扩展 props，可选渲染：
- `top_tags?: {tag,count}[]` → 渲染前 3 个标签 chip
- `heat_sources?` / `cooling_sources?` → 取首条作为"主要热源/降温源"一行摘要
- `updated_at?` → 右下角相对时间
- `showActions?: boolean` → 是否在卡片内显示「提交观察」「关注」操作

字段全部为可选，老调用点不传则不渲染，**不影响其他页面**。

### 2. 整卡可点击但允许内部按钮（关键结构）
当 `showActions=true` 时，改为方案 A：
```tsx
<article className="relative group ...">
  <Link to="/objects/$id" params={{id}} className="absolute inset-0 z-0" aria-label={...} />
  {/* 内容用 relative z-10，不拦截点击 */}
  <div className="relative z-10 pointer-events-none">…文字内容…</div>
  {/* 按钮用 relative z-20 + pointer-events-auto */}
  <div className="relative z-20 pointer-events-auto flex gap-2">
    <FollowButton .../>
    <Link to="/submit/$objectId" .../>
  </div>
</article>
```
好处：彻底避开 `<a>` 嵌套 `<a>` 的非法结构；按钮无需 `stopPropagation`；键盘 Tab 仍能聚焦覆盖层的 `<Link>` 与按钮。

当 `showActions=false`（默认）时保持现有整张 `<Link>` 结构，零回归。

### 3. `topics.$tag.tsx` 改为复用 `ObjectCard`
删除内联卡片 JSX，换成 `<ObjectCard {...o} />`，自动获得统一信息与交互。

### 4. 数据补齐
- `objects.tsx` 查询已经 `select *`，把 `top_tags / heat_sources / cooling_sources / updated_at` 透传给 `ObjectCard`
- `topics.$tag.tsx` 服务端函数 `getTopic` 若未返回这些字段，补 select（在 build 模式确认后再改）

### 5. 不动的部分
- 首页行式列表（"新加入对象"、升降温榜）保持紧凑列表语义，不强行改成大卡片
- 后台表格行不改
- `archive` 文本链接不改
- 不改视觉 token / 不重构样式

## 三、验收

- `/objects` 列表卡片显示：类型 / 名称 / 摘要 / 标签 / 主要热源 / 观察数 / 温度
- 标签页"相关对象"卡片与 `/objects` 一致
- 搜索结果与 `/objects` 一致
- 卡片任意空白区域点击 → 进对象详情
- 卡片内「关注」「提交观察」按钮点击 → 只执行按钮动作，不跳转
- 无嵌套 `<a>`（控制台无 hydration warning）
- 移动端 888px 视口下信息不溢出

## 四、不做的事

- 不删任何现有字段
- 不动温度计算 / 后端
- 不重做后台
- 不改首页布局
- 不引入新依赖
