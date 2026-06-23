新建一个汇总页 `/how-we-judge` —— "了解平台如何判断"，作为知识引擎与证据库的总入口；导航中合并这两项为单条链接。

## 改动

1. 新建 `src/routes/how-we-judge.tsx`
   - 路由 `createFileRoute("/how-we-judge")`，独立 `head()` 含标题/描述/og 元信息。
   - 页面结构（单列、editorial 风格，沿用现有 token）：
     a) 标题区："了解平台如何判断"，副标题简述判断流程：原则 → 标签 → 证据等级 → 案例 → 趋势温度。
     b) "我们怎么判断"四步说明（原则、标签体系、证据等级 A/B/C、人工审核），每步一句话。
     c) 两张大入口卡片：
        - 知识引擎 `/knowledge`：原则、标签、案例知识库。
        - 证据库（A 级）`/archive/evidence`：所有 A 级证据条目列表。
     d) 底部"想纠错？"指引链接到 `/feedback`。

2. `src/components/SiteLayout.tsx`：`SECONDARY_NAV` 把 `nav.evidence` 与 `nav.knowledge` 两项替换为 `{ to: "/how-we-judge", labelKey: "nav.howWeJudge" }`。

3. `src/lib/i18n.tsx`：新增中英 i18n 键
   - `nav.howWeJudge`：中"了解平台如何判断" / 英"How we judge"
   - `howWeJudge.eyebrow`、`howWeJudge.title`、`howWeJudge.body`
   - `howWeJudge.steps.1..4`（原则 / 标签体系 / 证据等级 A‑C / 人工复核）
   - `howWeJudge.card.knowledge.title`/`.body`/`.cta`
   - `howWeJudge.card.evidence.title`/`.body`/`.cta`
   - `howWeJudge.feedback`
   - `seo.howWeJudge.title` / `.description`（供 `usePageMeta` 使用）

4. 保留 `/knowledge` 与 `/archive/evidence` 路由本身不变。

## 不做
- 不删除原页面，仅改动导航 + 新增汇总页。
- 不改变数据接口。
- 不改其它页面文案。