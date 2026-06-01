# 女性体验温度 V1 实施计划

构建一个由用户观察、AI 分析驱动的女性体验观察平台。第一版聚焦核心闭环：浏览对象 → 提交观察 → AI 分析生成温度 → 管理员审核发布。

---

## 一、设计方向

**风格**：极简学术 / 媒体观察平台。白底、大量留白、高级灰、深色衬线标题 + 无衬线正文。完全规避粉色、卡通、社媒风。参考 Apple / Notion / Linear / 学术研究机构。

**视觉系统**（写入 `src/styles.css` 设计令牌）：
- 背景 `oklch(0.99 0 0)`，前景近黑 `oklch(0.18 0 0)`
- 高级灰层级：muted / border / subtle
- 单一强调色：深朱红 `oklch(0.55 0.18 25)`（用于高温警示和关键 CTA）
- 温度计渐变：冷青 → 暖灰 → 朱红
- 字体：标题 `Instrument Serif`，正文 `Inter`
- 圆角小（4–8px），阴影克制

**温度可视化**：垂直温度计 + 数字读数 + 区间色带（20–28 舒适青、29–40 中灰、41–60 暖橙、61–80 砖红、81–100 深红）。

---

## 二、技术栈

按平台规范使用 **TanStack Start + Lovable Cloud (Supabase)**（非用户文档中的 Next.js/Vercel；Lovable 上 TanStack Start 等价能力且无需切换）。Tailwind v4 + shadcn/ui。AI 通过 **Lovable AI Gateway** 调用 `google/gemini-2.5-pro`（替代 DeepSeek，更稳定且无需用户配密钥）。

---

## 三、数据库 Schema

| 表 | 关键字段 |
|---|---|
| `profiles` | id (FK auth.users), email, created_at |
| `user_roles` | user_id, role (enum: admin/user) |
| `objects` | id, name, type (enum), description, temperature, ai_summary, top_tags(jsonb), status(published/pending), created_at |
| `object_requests` | id, requested_name, requested_type, requester_id, status, admin_note |
| `observations` | id, object_id, user_id, content, scene, screenshot_url, reference_url, status(pending/approved/rejected), evidence_level, tags(jsonb), cleaned_content, created_at |
| `analysis_logs` | id, object_id, snapshot(jsonb), generated_at |

枚举：`object_type`、`evidence_level (A/B/C/D)`、`feminist_tag`（10 个一级标签）、`app_role`。

启用 RLS：访客可读 published 对象 / approved 观察；登录用户可提交；管理员通过 `has_role()` security definer 函数判定。

---

## 四、页面（路由）

- `/` 首页：搜索 + 热门对象 + 最新观察 + 温度排行榜
- `/objects` 全部对象（筛选 / 排序 / 搜索）
- `/objects/$id` 对象详情（温度计 + AI 总结 + 标签 + 观察列表 + 提交按钮）
- `/submit/$objectId` 提交观察
- `/request-object` 「我希望评估 XXX」
- `/discussions` 热门讨论
- `/about` 关于项目
- `/login` 邮箱验证码登录（Supabase magic link）
- `/admin` 管理后台（对象 / 评论 / 申请 / AI 分析 / 温度 子模块，由 `_authenticated` + has_role('admin') 守卫）

## 五、AI 工作流

`analyze-observation` server function：
1. 清洗内容 → 2. 提取事实描述 → 3. 识别 10 类标签 → 4. 判断证据等级 A/B/C/D → 5. D 级丢弃。
返回结构化 JSON（tool calling）写入 observation。

`recompute-temperature` server function（管理员触发或审核通过后自动）：聚合该对象所有 approved 且非 D 级观察 → 加权（A=1.0, B=0.6, C=0.3，标签多样性加成）→ 让 AI 生成总结 + 温度 20–100。写回 `objects` 并记录 `analysis_logs`。

**评论数量不直接影响温度**：使用归一化加权平均 + 标签集中度，而非求和。

## 六、硬规则保障

- 普通用户 UI 中无「创建对象」按钮；只能选择已有对象或走 `/request-object`
- 全站无点赞 / 点踩 / 评分 / 投票组件
- 温度逻辑文档化在 `src/lib/temperature.ts`，仅 AI 输出可写入

## 七、第一版交付范围

✅ 设计系统 + 全部前台页面（含温度计组件、对象卡、观察卡）
✅ 数据库 + RLS + 管理员角色
✅ 邮箱 magic link 登录
✅ 提交观察 + AI 分析 server function
✅ 管理后台：对象管理 / 评论审核 / 对象申请审核 / 重新生成温度
✅ Seed 数据：3 个示例对象 + 若干观察便于演示
❌ AI 日报 / 周报 / 趋势分析 / 年度榜单（按需求预留，不开发）

---

## 八、技术细节备注

- 使用 `createServerFn` + `requireSupabaseAuth` 中间件
- AI 调用全部在 server function 内，密钥不出后端
- 管理员审核通过自动触发温度重算
- 温度计组件用 SVG + CSS 渐变，避免依赖图表库
- 所有颜色、字体、间距通过 `src/styles.css` 设计令牌统一管理