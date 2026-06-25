import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/points-system")({
  head: () => ({
    meta: [
      { title: "积分制度 · 女性友好体验测评" },
      {
        name: "description",
        content: "贡献积分如何获得、如何升级、如何邀请朋友获得返利。",
      },
      { property: "og:title", content: "积分制度" },
    ],
    links: [{ rel: "canonical", href: "/points-system" }],
  }),
  component: PointsSystemPage,
});

function PointsSystemPage() {
  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-14">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Points System
          </p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">积分制度</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            欢迎来到我们的社区！在这里，你的每一次分享和邀请都在为这个世界"升温"。我们采用
            <span className="text-accent font-medium">「温度积分」</span>
            来衡量你的贡献。
          </p>

          <div className="mt-8 border-l-4 border-accent bg-accent/5 px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
              Core Logic · 核心逻辑
            </p>
            <p className="mt-2 font-serif text-2xl md:text-3xl">
              你帮助对象提升的温度 <span className="text-accent">=</span> 你获得的积分
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/contribution"
              className="inline-flex items-center justify-center bg-accent px-5 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              立即邀请朋友注册 →
            </Link>
            <p className="text-xs text-muted-foreground sm:max-w-sm">
              登录后获取你的专属邀请码与链接，每邀请一位好友注册得 <span className="text-accent">5 分</span>，好友贡献还有 <span className="text-accent">10%</span> 返利。
            </p>
          </div>

        </div>
      </section>

      {/* 积分获取途径 */}
      <section className="py-14 border-b border-border">
        <div className="container-prose">
          <h2 className="font-serif text-2xl md:text-3xl">📝 积分获取途径</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                tag: "01",
                title: "提交观察",
                reward: "1 分 / 10°C",
                desc: "当你发布的内容/数据被采纳，并为对象带来了温度提升。",
                eg: "例如：你的报告帮助对象提升了 50°C，你将获得 5 分。",
              },
              {
                tag: "02",
                title: "邀请好友",
                reward: "5 分 / 人",
                desc: "成功邀请新用户注册（通过你的专属链接）。",
                eg: "好友点击链接并完成注册即刻到账。",
              },
              {
                tag: "03",
                title: "好友贡献",
                reward: "1 分 / 10 分",
                desc: "你邀请的好友（直系下线）获得了积分。",
                eg: "好友每赚 10 分，你额外得 1 分。不设上限，自动结算。",
              },
            ].map((item) => (
              <div key={item.tag} className="border border-border p-6 flex flex-col">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {item.tag}
                </p>
                <h3 className="mt-2 font-serif text-xl">{item.title}</h3>
                <p className="mt-3 text-2xl font-medium text-accent">{item.reward}</p>
                <p className="mt-3 text-sm leading-relaxed">{item.desc}</p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-t border-dashed border-border pt-3">
                  {item.eg}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 举例 */}
      <section className="py-14 border-b border-border">
        <div className="container-prose">
          <h2 className="font-serif text-2xl md:text-3xl">💡 举个栗子</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            假设 <span className="text-foreground font-medium">用户 A</span> 邀请了{" "}
            <span className="text-foreground font-medium">用户 B</span>：
          </p>

          <ol className="mt-8 space-y-6">
            {[
              {
                step: "STEP 1",
                title: "注册奖励",
                body: "用户 B 注册成功，用户 A 立即 +5 分。",
              },
              {
                step: "STEP 2",
                title: "观察奖励",
                body: "用户 B 提交了一份报告，系统判定提升了 30°C，用户 B 获得 +3 分。",
              },
              {
                step: "STEP 3",
                title: "连带奖励（本次）",
                body: "因为用户 B 本次获得 3 分，不足 10 分按取整计算，用户 A 本次不加分。（若 B 一次性获得 10 分，A 则 +1 分）",
              },
              {
                step: "STEP 4",
                title: "长期分润",
                body: "用户 B 后来非常活跃，累计获得了 100 分贡献值。用户 A 将因此获得额外的 10 分（100 ÷ 10 = 10）。",
              },
            ].map((s) => (
              <li key={s.step} className="flex gap-5 border-l-2 border-accent pl-5">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
                    {s.step}
                  </p>
                  <p className="mt-1 font-serif text-lg">{s.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 注意事项 */}
      <section className="py-14">
        <div className="container-prose">
          <h2 className="font-serif text-2xl md:text-3xl">⚠️ 注意事项</h2>

          <div className="mt-8 space-y-4">
            {[
              {
                k: "真实性",
                v: "所有提交的观察数据需经过审核，造假将被扣除积分并封号。",
              },
              {
                k: "结算延迟",
                v: "积分可能会在系统确认温度提升后的 24 小时内到账。",
              },
              {
                k: "邀请绑定",
                v: "一旦通过链接注册，该好友将永久与你的账号关联，后续他的所有贡献你都能分润。",
              },
            ].map((n) => (
              <div key={n.k} className="border border-border p-5 flex gap-4">
                <div className="min-w-[72px] text-sm font-medium text-accent">
                  {n.k}
                </div>
                <div className="text-sm leading-relaxed">{n.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 text-sm">
            <Link
              to="/contribution"
              className="border border-foreground bg-foreground px-4 py-2 text-background hover:bg-accent hover:border-accent"
            >
              查看我的积分 →
            </Link>
            <Link
              to="/leaderboard"
              className="border border-border px-4 py-2 hover:border-foreground"
            >
              贡献榜
            </Link>
            <Link
              to="/how-we-judge"
              className="border border-border px-4 py-2 hover:border-foreground"
            >
              ← 返回判断说明
            </Link>
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}
