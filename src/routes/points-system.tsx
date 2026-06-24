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
            完整的积分制度内容即将更新。
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-prose">
          <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            内容正在准备中
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
