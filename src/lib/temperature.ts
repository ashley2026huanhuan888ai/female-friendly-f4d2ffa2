// 温度区间逻辑：20-100，由 AI 输出，仅在后端写入
export type TempBand = "comfort" | "minor" | "notable" | "high" | "critical";

export interface BandInfo {
  band: TempBand;
  label: string;
  color: string; // CSS variable
  range: [number, number];
}

export const BANDS: BandInfo[] = [
  { band: "comfort", label: "舒适区", color: "var(--temp-cool)", range: [20, 28] },
  { band: "minor", label: "轻微争议", color: "var(--temp-neutral)", range: [29, 40] },
  { band: "notable", label: "明显争议", color: "var(--temp-warm)", range: [41, 60] },
  { band: "high", label: "高温争议", color: "var(--temp-hot)", range: [61, 80] },
  { band: "critical", label: "极高温争议", color: "var(--temp-critical)", range: [81, 100] },
];

export function bandOf(t: number): BandInfo {
  const v = Math.max(20, Math.min(100, t));
  return BANDS.find((b) => v >= b.range[0] && v <= b.range[1]) ?? BANDS[0];
}

// 证据等级权重（评论数不直接影响）
export const EVIDENCE_WEIGHT: Record<string, number> = { A: 1.0, B: 0.6, C: 0.3, D: 0 };

export const FEMINIST_TAGS = [
  "女性物化",
  "男性凝视",
  "能力贬低",
  "性别角色固化",
  "容貌规训",
  "生育规训",
  "性羞辱",
  "受害者归因",
  "女性工具化",
  "伪女性友好",
] as const;

export type FeministTag = (typeof FEMINIST_TAGS)[number];

export const OBJECT_TYPE_LABELS: Record<string, string> = {
  brand: "品牌",
  product: "产品",
  service: "服务",
  organization: "企业组织",
  film: "影视作品",
  game: "游戏",
  show: "综艺节目",
  event: "公共事件",
};
