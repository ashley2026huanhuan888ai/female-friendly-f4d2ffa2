// 温度智能引擎 V1 —— 纯函数，便于测试与解释
// 公式：T = clamp(20,100, 20 + (Knowledge − Positive + Evidence + Case) × Diversity + Trend)

export const EVIDENCE_FACTOR: Record<string, number> = { A: 1.0, B: 0.8, C: 0.5, D: 0 };

export interface TagMeta {
  code: string;
  name_zh: string;
  weight: number;
  polarity: "negative" | "positive";
}

export interface EngineObservation {
  id: string;
  evidence_level: string | null;
  confidence: number;
  tags: string[]; // 中文 name_zh（提交时即为中文）
  cases_cited: string[];
  created_at: string;
}

export interface SourceContribution {
  tag: string;
  delta: number; // 正数 = 升温 / 负数 = 降温
  count: number;
}

export interface TemperatureBreakdown {
  base: number;            // 20
  knowledge: number;       // 负面标签贡献（>=0）
  positive: number;        // 正向标签贡献（>=0，从总温度中扣减）
  evidence: number;        // 证据质量加成
  case: number;            // 案例引用贡献
  trend: number;           // 趋势贡献（可正可负）
  diversity: number;       // 多样性乘数
  cooling: number;         // 自然降温（<=0）
  active_count: number;    // 参与计算的观察数（A/B/C）
  total_count: number;     // 全部已通过观察数
}

export interface EngineResult {
  temperature: number;
  breakdown: TemperatureBreakdown;
  heat_sources: SourceContribution[];
  cooling_sources: SourceContribution[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

function trendImpact(observations: EngineObservation[]): number {
  if (observations.length < 3) return 0;
  const now = Date.now();
  const day14 = 14 * 86400_000;
  const recent = observations.filter((o) => now - new Date(o.created_at).getTime() <= day14).length;
  const baseline = observations.length / Math.max(1, Math.ceil((now - new Date(observations[observations.length - 1].created_at).getTime()) / day14));
  if (recent === 0) return -2;
  const ratio = recent / Math.max(0.5, baseline);
  // 近期密度 > 1.5×历史均值 → 升温；< 0.5× → 降温
  if (ratio >= 1.5) return clamp(Math.log2(ratio) * 2, 0, 6);
  if (ratio <= 0.5) return clamp(-Math.log2(1 / Math.max(ratio, 0.1)) * 1, -3, 0);
  return 0;
}

export function runEngine(
  observations: EngineObservation[],
  tagMap: Map<string, TagMeta>,
  opts: { cooling?: number } = {},
): EngineResult {
  const base = 20;
  const total_count = observations.length;
  const active = observations.filter((o) => (o.evidence_level ?? "D") !== "D");
  const N = active.length;

  if (N === 0) {
    return {
      temperature: clamp(base + (opts.cooling ?? 0), 20, 100),
      breakdown: {
        base, knowledge: 0, positive: 0, evidence: 0, case: 0,
        trend: 0, diversity: 1, cooling: opts.cooling ?? 0,
        active_count: 0, total_count,
      },
      heat_sources: [],
      cooling_sources: [],
    };
  }

  const heatBy = new Map<string, { d: number; c: number }>();
  const coolBy = new Map<string, { d: number; c: number }>();
  let sumHeat = 0, sumCool = 0, sumEv = 0, sumCase = 0;

  for (const o of active) {
    const evF = EVIDENCE_FACTOR[o.evidence_level ?? "D"] ?? 0;
    const conf = clamp(o.confidence ?? 0.7, 0, 1);
    // 证据质量加成（A/B 单独给小幅加成，作为"证据强度"维度）
    sumEv += evF * 1.5;
    // 案例引用
    sumCase += (o.cases_cited?.length ?? 0) * 0.8;
    for (const tagName of o.tags ?? []) {
      const meta = tagMap.get(tagName);
      if (!meta) continue;
      const contrib = meta.weight * evF * conf;
      if (meta.polarity === "positive") {
        sumCool += contrib;
        const cur = coolBy.get(tagName) ?? { d: 0, c: 0 };
        coolBy.set(tagName, { d: cur.d + contrib, c: cur.c + 1 });
      } else {
        sumHeat += contrib;
        const cur = heatBy.get(tagName) ?? { d: 0, c: 0 };
        heatBy.set(tagName, { d: cur.d + contrib, c: cur.c + 1 });
      }
    }
  }

  const avgHeat = sumHeat / N;
  const avgCool = sumCool / N;
  const avgEv = sumEv / N;
  const avgCase = sumCase / N;
  const diversity = 1 + Math.min(0.3, Math.log10(N + 1) * 0.15);
  const trend = trendImpact(active);
  const cooling = opts.cooling ?? 0;

  const raw =
    base +
    (avgHeat - avgCool + avgEv + avgCase) * diversity +
    trend +
    cooling;

  const temperature = clamp(r1(raw), 20, 100);

  const toSources = (m: Map<string, { d: number; c: number }>, sign: 1 | -1): SourceContribution[] =>
    [...m.entries()]
      .map(([tag, { d, c }]) => ({ tag, delta: r1(sign * (d / N) * diversity), count: c }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);

  return {
    temperature,
    breakdown: {
      base,
      knowledge: r1(avgHeat * diversity),
      positive: r1(avgCool * diversity),
      evidence: r1(avgEv * diversity),
      case: r1(avgCase * diversity),
      trend: r1(trend),
      diversity: r1(diversity),
      cooling: r1(cooling),
      active_count: N,
      total_count,
    },
    heat_sources: toSources(heatBy, 1),
    cooling_sources: toSources(coolBy, -1),
  };
}
