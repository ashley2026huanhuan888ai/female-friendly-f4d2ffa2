// 严重标签 + 强证据 → 最低温度安全网（规则刚性，AI 不能覆盖）
// 公式：final_temperature = max(ai_temperature, rule_minimum_temperature, admin_temperature?)

export type EvidenceLevel = "A" | "B" | "C" | "D";

// 监管处罚关键词 → 命中后 evidence_level 视为 A
const REGULATORY_PATTERNS = [
  "监管处罚", "市监", "市场监管", "市监局", "法院判决", "判决书", "官方通报",
  "行政处罚", "处罚告知", "立案查处", "立案", "罚款", "处罚决定",
];

// 严重标签 → 最低温度（A 级证据下）
// key 为标签 name_zh，与 knowledge_tags 一致
const SEVERE_TAG_MIN: Record<string, number> = {
  "性暴力暗示 / 迷奸语境": 85,
  "性羞辱": 75,
  "受害者归因": 75,
  "生育规训": 75,
  "性别歧视营销": 75,
  "身体羞辱": 70,
  "女性物化": 65,
  "女性工具化": 65,
  "能力贬低": 55,
  "性别角色固化": 50,
  "男性凝视": 50,
  "容貌规训": 50,
  "低俗擦边营销": 50,
  "伪女性友好": 45,
};

// 普通性别刻板印象（兜底 A 级）
const STEREOTYPE_BASE_MIN = 45;

export interface RuleInput {
  tags: string[];
  evidence_level: EvidenceLevel | string | null | undefined;
  has_regulatory_penalty?: boolean;
  observation_content?: string | null;
}

export interface RuleOutput {
  rule_minimum_temperature: number;
  triggered_rules: string[];
  effective_evidence_level: EvidenceLevel;
  has_regulatory_penalty: boolean;
}

export function detectRegulatoryPenalty(content?: string | null): boolean {
  if (!content) return false;
  return REGULATORY_PATTERNS.some((kw) => content.includes(kw));
}

export function calculateRuleMinimumTemperature(input: RuleInput): RuleOutput {
  const detected = input.has_regulatory_penalty || detectRegulatoryPenalty(input.observation_content);
  // 监管命中 → 提升至 A
  const ev: EvidenceLevel = detected
    ? "A"
    : ((["A", "B", "C", "D"].includes(String(input.evidence_level))
        ? input.evidence_level
        : "C") as EvidenceLevel);

  const triggered: string[] = [];
  let min = 20;

  // 仅 A 级证据触发硬性最低温度
  if (ev === "A") {
    let hitSevere = false;
    for (const tag of input.tags ?? []) {
      const base = SEVERE_TAG_MIN[tag];
      if (base !== undefined) {
        hitSevere = true;
        if (base > min) min = base;
        triggered.push(`A 级证据 + ${tag} → ≥${base}°C`);
        // 监管处罚 + 性暴力暗示 → 90
        if (detected && tag === "性暴力暗示 / 迷奸语境" && min < 90) {
          min = 90;
          triggered.push("A 级证据 + 监管处罚 + 性暴力暗示 / 迷奸语境 → ≥90°C");
        }
      }
    }
    if (!hitSevere && (input.tags?.length ?? 0) > 0) {
      min = STEREOTYPE_BASE_MIN;
      triggered.push(`A 级证据 + 性别刻板印象 → ≥${STEREOTYPE_BASE_MIN}°C`);
    }
  }

  return {
    rule_minimum_temperature: min,
    triggered_rules: triggered,
    effective_evidence_level: ev,
    has_regulatory_penalty: detected,
  };
}

// 在一组观察上汇总规则最低温度（取所有观察中最高的 rule_min）
export function aggregateRuleMinimum(
  observations: Array<{
    tags: string[];
    evidence_level: string | null;
    content?: string | null;
    summary?: string | null;
    cleaned_content?: string | null;
  }>,
): RuleOutput {
  let best: RuleOutput = {
    rule_minimum_temperature: 20,
    triggered_rules: [],
    effective_evidence_level: "D",
    has_regulatory_penalty: false,
  };
  for (const o of observations) {
    const text = [o.content, o.summary, o.cleaned_content].filter(Boolean).join("\n");
    const r = calculateRuleMinimumTemperature({
      tags: o.tags ?? [],
      evidence_level: o.evidence_level,
      observation_content: text,
    });
    if (r.rule_minimum_temperature > best.rule_minimum_temperature) {
      best = r;
    } else if (r.rule_minimum_temperature === best.rule_minimum_temperature && r.triggered_rules.length) {
      // 合并触发说明，便于审计
      best = {
        ...best,
        triggered_rules: Array.from(new Set([...best.triggered_rules, ...r.triggered_rules])),
        has_regulatory_penalty: best.has_regulatory_penalty || r.has_regulatory_penalty,
      };
    }
  }
  return best;
}
