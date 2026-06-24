## 目标
让 hero 段落里 "它更像一本公开观察笔记：…我们记录它的来源、证据和讨论。" 成为独立段落（前后空行），英文版对应句同样处理。

## 改动
1. `src/lib/i18n.tsx`
   - 中文 `home.hero.body` 拆成三个键：`home.hero.body.intro`（"这里不是打分榜，也不是审判席。"）、`home.hero.body.main`（"它更像一本公开观察笔记：…讨论。"）。把原 `home.hero.disclaimer` 保持不变。
   - 英文 `home.hero.body` 同样拆成 `intro` + `main`。

2. `src/routes/index.tsx`（第 95–101 行）
   - 将单个 `<p>` 替换为三个 `<p>` 段落，中间通过 `space-y-3`（包一层 div）实现段落间距：
     - 第 1 段：`home.hero.body.intro`
     - 第 2 段（独立段落）：`home.hero.body.main`
     - 第 3 段：`<strong>{disclaimer}</strong>` + `sentenceGap` + `home.hero.actions`
   - 保留原有 `text-sm/md:text-base text-muted-foreground max-w-md/2xl` 样式。

## 验证
preview 首页 hero 区，目标句独占一段，上下有空行。
