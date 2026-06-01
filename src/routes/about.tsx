import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { BANDS, FEMINIST_TAGS } from "@/lib/temperature";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于项目 · 女性体验温度" },
      { name: "description", content: "了解「女性体验温度」平台的方法论、温度逻辑与硬规则。" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <SiteLayout>
      <div className="container-prose max-w-3xl py-20">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Methodology</div>
        <h1 className="mt-4 font-serif text-5xl text-balance">关于「女性体验温度」</h1>

        <Section title="项目目标">
          <p>
            本平台收集用户对品牌、产品、服务、影视作品、企业组织、公共事件等对象的女性体验观察，
            利用 AI 进行结构化分析，最终以「女性体验温度」呈现。温度越高，代表反馈中出现的性别偏见、
            女性物化、性别规训等议题越集中。
          </p>
          <p className="mt-3 text-muted-foreground">
            本平台不进行法律意义上的事实认定，不进行道德审判。
          </p>
        </Section>

        <Section title="温度区间">
          <div className="space-y-2">
            {BANDS.map((b) => (
              <div key={b.band} className="flex items-baseline gap-4 text-sm">
                <span className="inline-block h-2 w-12 rounded-full" style={{ background: b.color }} />
                <span className="font-mono tabular-nums text-muted-foreground">{b.range[0]}–{b.range[1]}°C</span>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            舒适温度区间为 20–28°C，超过 28°C 代表出现不同程度的性别争议。
          </p>
        </Section>

        <Section title="证据等级">
          <ul className="space-y-2 text-sm">
            <li><strong>A 级</strong> · 截图 / 视频 / 广告原文 / 台词等原始证据</li>
            <li><strong>B 级</strong> · 详细描述（时间、地点、情境清晰）</li>
            <li><strong>C 级</strong> · 简单感受或模糊描述</li>
            <li><strong>D 级</strong> · 辱骂、人身攻击、无效内容 — 不参与温度计算</li>
          </ul>
        </Section>

        <Section title="分析标签">
          <div className="flex flex-wrap gap-2">
            {FEMINIST_TAGS.map((t) => (
              <span key={t} className="border border-border px-3 py-1 text-xs">#{t}</span>
            ))}
          </div>
        </Section>

        <Section title="硬规则">
          <ul className="space-y-3 text-sm">
            <li>· <strong>用户不能直接创建评估对象</strong>。只能选择已有对象或通过「<Link to="/request-object" className="underline">我希望评估</Link>」申请。</li>
            <li>· <strong>不采用投票机制</strong>。无点赞、点踩、星级、用户投票。AI 仅依据内容质量分析。</li>
            <li>· <strong>评论数量不直接影响温度</strong>。温度由证据强度、标签多样性、议题集中度决定。</li>
          </ul>
        </Section>

        <Section title="AI 工作流">
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li>1. 用户提交观察</li>
            <li>2. 内容清洗，提取事实描述</li>
            <li>3. AI 识别标签</li>
            <li>4. 判断证据等级</li>
            <li>5. 管理员审核</li>
            <li>6. 加权聚合，生成对象总结与温度</li>
            <li>7. 发布</li>
          </ol>
        </Section>
      </div>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-4 text-base leading-relaxed">{children}</div>
    </section>
  );
}
