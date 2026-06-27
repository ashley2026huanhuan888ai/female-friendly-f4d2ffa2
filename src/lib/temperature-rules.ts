// 严重标签 + 强证据 → 最低温度安全网（规则刚性，AI 不能覆盖）
// final_temperature = max(ai_temperature, rule_minimum_temperature, admin_temperature?)
//
// 本文件是平台唯一的"强证据/严重标签 → 温度地板"事实来源。
// 任何监管/法律/严重标签关键词必须在这里维护，禁止在其它文件里另写一套。

export type EvidenceLevel = "A" | "B" | "C" | "D";

// ===== 法律 / 监管 / 司法 强证据关键词（唯一来源）=====
// 命中其中任一关键词 → 视为 A 级证据，且 rule_minimum_temperature >= 90。
export const LEGAL_REGULATORY_PATTERNS: readonly string[] = [
  // 法院 / 司法
  "法院判决",
  "判决书",
  "判决",
  "司法裁判",
  "裁判文书",
  "违法事实成立",
  "违法事实",
  "明确法律责任",
  "法律责任",
  "民事判决",
  "刑事判决",
  "公益诉讼",
  // 仲裁
  "劳动仲裁",
  "仲裁裁决",
  "仲裁",
  // 行政 / 监管
  "行政处罚",
  "监管处罚",
  "处罚决定书",
  "处罚决定",
  "处罚告知书",
  "处罚告知",
  "市监",
  "市监局",
  "市场监管",
  "市场监管局",
  "监管局",
  "网信办",
  "工商局",
  "检察院",
  // 处罚措施
  "罚款",
  "罚单",
  "没收",
  "责令整改",
  "约谈",
  // 立案 / 调查
  "立案查处",
  "立案调查",
  "立案",
  // 通报
  "官方通报",
  "通报批评",
];

// 严重标签 → 最低温度（A 级证据下）。key 为标签 name_zh，与 knowledge_tags 一致。
// 这些是"即使没有命中法律/监管，但有严重标签 + A 级证据"的次级地板。
const SEVERE_TAG_MIN: Record<string, number> = {
  "性暴力暗示 / 迷奸语境": 85,
  性羞辱: 75,
  受害者归因: 75,
  生育规训: 75,
  性别歧视营销: 75,
  身体羞辱: 70,
  女性物化: 65,
  女性工具化: 65,
  能力贬低: 55,
  性别角色固化: 50,
  男性凝视: 50,
  容貌规训: 50,
  低俗擦边营销: 50,
  伪女性友好: 75,
};

// 法律/监管强证据触发的最低温度（"女性友好风险温度计"的硬性产品规则）
export const LEGAL_PENALTY_MIN_TEMPERATURE = 90;

// A 级证据 + 任何性别刻板印象类标签的兜底地板
const STEREOTYPE_BASE_MIN = 45;

// ===== 标签规范化（消除空格 / 全角半角 / 斜杠 / 大小写 / 英文别名 差异）=====

// 英文/旧标签 → canonical name_zh
const TAG_ALIASES: Record<string, string> = {
  objectification: "女性物化",
  objectify: "女性物化",
  "male gaze": "男性凝视",
  male_gaze: "男性凝视",
  "victim blaming": "受害者归因",
  victim_blaming: "受害者归因",
  "body shaming": "身体羞辱",
  body_shaming: "身体羞辱",
  "slut shaming": "性羞辱",
  slut_shaming: "性羞辱",
  "rape culture": "性暴力暗示 / 迷奸语境",
  rape_culture: "性暴力暗示 / 迷奸语境",
  性暴力暗示: "性暴力暗示 / 迷奸语境",
  迷奸语境: "性暴力暗示 / 迷奸语境",
  "性暴力暗示/迷奸语境": "性暴力暗示 / 迷奸语境",
};

function fold(s: string): string {
  return s
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)) // 全角 → 半角
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeTag(raw: string | null | undefined): string {
  if (!raw) return "";
  const folded = fold(String(raw));
  // 别名映射
  const alias = TAG_ALIASES[folded];
  if (alias) return alias;
  // 与 SEVERE_TAG_MIN keys 做 fold 比较
  for (const canon of Object.keys(SEVERE_TAG_MIN)) {
    if (fold(canon) === folded) return canon;
    // 去掉所有空格和斜杠后再比一次
    if (fold(canon).replace(/[\s/]/g, "") === folded.replace(/[\s/]/g, "")) return canon;
  }
  // 默认返回 trim 后的原值（保留中文）
  return String(raw).trim();
}

export function normalizeTags(tags: Array<string | null | undefined> | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const out = new Set<string>();
  for (const t of tags) {
    const n = normalizeTag(t);
    if (n) out.add(n);
  }
  return [...out];
}

// ===== 强证据识别（唯一函数）=====

export function detectLegalPenalty(content?: string | null): boolean {
  if (!content) return false;
  return LEGAL_REGULATORY_PATTERNS.some((kw) => content.includes(kw));
}

// 兼容别名
export const detectRegulatoryPenalty = detectLegalPenalty;
export const detectEvidenceA = detectLegalPenalty;

// ===== 规则地板计算 =====

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

export function calculateRuleMinimumTemperature(input: RuleInput): RuleOutput {
  const detected =
    input.has_regulatory_penalty === true || detectLegalPenalty(input.observation_content);

  // 命中法律/监管强证据 → 强制 A 级
  const ev: EvidenceLevel = detected
    ? "A"
    : ((["A", "B", "C", "D"].includes(String(input.evidence_level))
        ? input.evidence_level
        : "C") as EvidenceLevel);

  const normTags = normalizeTags(input.tags ?? []);
  const triggered: string[] = [];
  let min = 20;

  // 1) 法律/监管强证据 → 硬地板 90°C（不依赖标签命中）
  if (detected) {
    min = LEGAL_PENALTY_MIN_TEMPERATURE;
    triggered.push(`法律 / 监管强证据 → ≥${LEGAL_PENALTY_MIN_TEMPERATURE}°C`);
  }

  // 2) A 级证据 + 严重标签 → 次级地板
  if (ev === "A") {
    let hitSevere = false;
    for (const tag of normTags) {
      const base = SEVERE_TAG_MIN[tag];
      if (base !== undefined) {
        hitSevere = true;
        if (base > min) {
          min = base;
          triggered.push(`A 级证据 + ${tag} → ≥${base}°C`);
        }
      }
    }
    if (!hitSevere && normTags.length > 0 && min < STEREOTYPE_BASE_MIN) {
      min = STEREOTYPE_BASE_MIN;
      triggered.push(`A 级证据 + 性别刻板印象 → ≥${STEREOTYPE_BASE_MIN}°C`);
    }
  }

  // 3) 厌女语义关键词地板（不依赖标签，扫描观察文本本身）
  //    兜住"有详细描述但未打标签"的观察
  if (input.observation_content) {
    const semantic = detectMisogynySemantic(input.observation_content);
    if (semantic.floor > min) min = semantic.floor;
    for (const hit of semantic.hits) {
      triggered.push(`语义命中: ${hit.keyword} → ≥${hit.floor}°C`);
    }
  }

  return {
    rule_minimum_temperature: min,
    triggered_rules: triggered,
    effective_evidence_level: ev,
    has_regulatory_penalty: detected,
  };
}

// ===== 厌女语义关键词地板 =====
// 命中即作为"地板"参与 max() 比较；不替代 AI 引擎，引擎更高仍取高值。
export const MISOGYNY_SEMANTIC_FLOORS: ReadonlyArray<{
  floor: number;
  keywords: readonly string[];
}> = [
  {
    floor: 75,
    keywords: ["迷奸", "下药", "性暴力", "强奸文化", "荡妇羞辱", "性羞辱"],
  },
  {
    floor: 60,
    keywords: [
      "受害者归因",
      "受害者有罪",
      "活该被",
      "自找的",
      "生育规训",
      "催生",
      "不生孩子就",
      "女人就该生",
      "女人就要生",
      "容貌羞辱",
      "身材羞辱",
      "丑女",
      "肥婆",
    ],
  },
  {
    floor: 45,
    keywords: [
      "物化女性",
      "女性工具化",
      "男性凝视",
      "奇观化",
      "贤妻良母",
      "为了儿子",
      "为了丈夫",
      "相夫教子",
      "女人头发长见识短",
      "女司机",
      "女主内",
      "男主外",
      "性别角色固化",
      "厌女",
    ],
  },
  {
    floor: 75,
    keywords: ["擦边营销", "低俗营销", "伪女性友好", "疯女人", "疯姐姐", "歇斯底里"],
  },
];

export function detectMisogynySemantic(text: string): {
  floor: number;
  hits: Array<{ keyword: string; floor: number }>;
} {
  if (!text) return { floor: 20, hits: [] };
  let floor = 20;
  const hits: Array<{ keyword: string; floor: number }> = [];
  const seen = new Set<string>();
  for (const tier of MISOGYNY_SEMANTIC_FLOORS) {
    for (const kw of tier.keywords) {
      if (seen.has(kw)) continue;
      if (text.includes(kw)) {
        seen.add(kw);
        hits.push({ keyword: kw, floor: tier.floor });
        if (tier.floor > floor) floor = tier.floor;
      }
    }
  }
  return { floor, hits };
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
    // 强证据扫描覆盖：content / summary / cleaned_content / tags（标签中也可能直接命中法律/监管关键词）
    const tagText = Array.isArray(o.tags) ? o.tags.join("\n") : "";
    const text = [o.content, o.summary, o.cleaned_content, tagText].filter(Boolean).join("\n");
    const r = calculateRuleMinimumTemperature({
      tags: o.tags ?? [],
      evidence_level: o.evidence_level,
      observation_content: text,
    });
    if (r.rule_minimum_temperature > best.rule_minimum_temperature) {
      best = r;
    } else if (
      r.rule_minimum_temperature === best.rule_minimum_temperature &&
      r.triggered_rules.length
    ) {
      best = {
        ...best,
        triggered_rules: Array.from(new Set([...best.triggered_rules, ...r.triggered_rules])),
        has_regulatory_penalty: best.has_regulatory_penalty || r.has_regulatory_penalty,
      };
    }
  }
  return best;
}
