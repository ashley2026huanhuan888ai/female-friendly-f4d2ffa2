import { createFileRoute } from "@tanstack/react-router";
import { LongImagePreview } from "@/components/LongImagePreview";

export const Route = createFileRoute("/dev/long-image-preview")({
  component: DevLongImagePreview,
  head: () => ({
    meta: [{ title: "LongImagePreview 演示" }],
  }),
});

const SAMPLE =
  "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=720&q=80&auto=format";

function DevLongImagePreview() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">LongImagePreview 演示</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          列表缩略图顶对齐裁剪，底部渐隐提示；点击进入全屏竖向滚动模式。
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          示例 1 · 长资讯截图（默认 60vh）
        </h2>
        <LongImagePreview src={SAMPLE} alt="示例长图" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          示例 2 · 自定义 maxHeight 40vh
        </h2>
        <LongImagePreview src={SAMPLE} alt="示例长图" thumbnailMaxHeight="40vh" />
      </section>
    </div>
  );
}
