import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExportCardDialog } from "@/components/ExportCardDialog";

export const Route = createFileRoute("/dev/export-preview")({
  component: DevExportPreview,
});

const SAMPLES: { label: string; name: string; temperature: number }[] = [
  { label: "短 (2 字)", name: "甄嬛", temperature: 28 },
  { label: "中等 (4 字)", name: "父母爱情", temperature: 55 },
  { label: "较长 (12 字)", name: "某某品牌2024秋冬新品", temperature: 72 },
  { label: "超长 (24 字)", name: "一个非常非常长的品牌或作品名称用于压力测试边界情况", temperature: 88 },
  { label: "英文长名", name: "A Very Long Western Brand Name For Stress Testing", temperature: 42 },
];

const DEMO_OBS = [
  {
    id: "demo-1",
    content: "示范观察原文。该作品女性角色被边缘化或工具化，部分情节强化传统性别角色固化。",
    cleaned_content: null,
    summary: "女性角色多以婚姻为归宿，主体性不足",
    tags: ["gender_role_fixation", "female_objectification"],
    screenshot_url: null,
    reference_url: null,
    created_at: new Date().toISOString(),
    evidence_level: 3,
    scene: "全剧",
  },
];

function DevExportPreview() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="font-serif text-2xl">导出长图 - 名称长度压力测试</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        点击下方任意样本打开导出弹窗，验证二维码、温度、对象名在不同长度下都不溢出。
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SAMPLES.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="border border-border p-4 text-left hover:border-accent"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label} · {s.temperature}°C
            </div>
            <div className="mt-1 font-serif text-lg">{s.name}</div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              字符数: {s.name.length}
            </div>
          </button>
        ))}
      </div>

      {activeIdx !== null && (
        <ExportCardDialog
          open
          onClose={() => setActiveIdx(null)}
          object={{
            id: `demo-${activeIdx}`,
            name: SAMPLES[activeIdx].name,
            type: "tv_show",
            temperature: SAMPLES[activeIdx].temperature,
          }}
          observations={DEMO_OBS as any}
        />
      )}
    </div>
  );
}
