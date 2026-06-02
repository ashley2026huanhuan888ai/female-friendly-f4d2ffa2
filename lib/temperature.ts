// 温度区间逻辑：20-100，由 AI 输出，仅在后端写入
export type TempBand = "comfort" | "minor" | "notable" | "high" | "critical";

export interface BandInfo {
  band: TempBand;
  label: string;
  color: string; // CSS variable
  range: [number, number];
}

export const BANDS: BandInfo[] = [
  { band: "comfort", label: "女性友好", color: "var(--temp-cool)", range: [20, 28] },
  { band: "minor", label: "轻微争议", color: "var(--temp-neutral)", range: [29, 40] },
  { band: "notable", label: "明显争议", color: "var(--temp-warm)", range: [41, 60] },
  { band: "high", label: "高温争议", color: "var(--temp-hot)", range: [61, 80] },
  { band: "critical", label: "极高温争议", color: "var(--temp-critical)", range: [81, 100] },
];

export function bandOf(t: number): BandInfo {
  const v = Math.max(20, Math.min(100, t));
  return BANDS.find((b) => v >= b.range[0] && v <= b.range[1]) ?? BANDS[0];
}

// 证据强度：A=1.0 / B=0.8 / C=0.5 / D=0（D 不参与计算）
export const EVIDENCE_STRENGTH: Record<string, number> = { A: 1.0, B: 0.8, C: 0.5, D: 0 };
// 兼容旧字段
export const EVIDENCE_WEIGHT = EVIDENCE_STRENGTH;

// 一级标签 + 权重（按 V1 引擎规范）
export const TAG_WEIGHTS: Record<string, number> = {
  "女性物化": 8,
  "男性凝视": 6,
  "能力贬低": 9,
  "性别角色固化": 8,
  "容貌规训": 6,
  "生育规训": 10,
  "性羞辱": 10,
  "受害者归因": 10,
  "女性工具化": 7,
  "伪女性友好": 5,
};

export const FEMINIST_TAGS = Object.keys(TAG_WEIGHTS) as ReadonlyArray<string>;
export type FeministTag = keyof typeof TAG_WEIGHTS;

// 观察贡献值 = Σ(标签权重) × 证据强度 × 置信度
export function computeImpact(tags: string[], evidence_level: string, confidence: number): number {
  const strength = EVIDENCE_STRENGTH[evidence_level] ?? 0;
  if (strength === 0) return 0;
  const tagW = tags.reduce((s, t) => s + (TAG_WEIGHTS[t] ?? 0), 0);
  return Math.round(tagW * strength * Math.max(0, Math.min(1, confidence)) * 10) / 10;
}

// 对象温度公式：20 + 平均影响 × 调整系数，clamp [20,100]
export function computeTemperature(impacts: number[]): number {
  if (impacts.length === 0) return 24;
  const valid = impacts.filter((i) => i > 0);
  if (valid.length === 0) return 22;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  // 调整系数：观察数量带来轻微加成（log 缓增），但不主导
  const diversityBoost = 1 + Math.min(0.3, Math.log10(valid.length + 1) * 0.15);
  const temp = 20 + avg * diversityBoost;
  return Math.max(20, Math.min(100, Math.round(temp * 10) / 10));
}

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
