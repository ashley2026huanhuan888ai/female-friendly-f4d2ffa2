import { describe, it, expect } from "vitest";
import {
  calculateRuleMinimumTemperature,
  aggregateRuleMinimum,
  detectLegalPenalty,
  normalizeTag,
  normalizeTags,
  LEGAL_PENALTY_MIN_TEMPERATURE,
} from "./temperature-rules";
import { runEngine, type TagMeta } from "./temperature-engine";

const emptyTagMap = new Map<string, TagMeta>();

function obs(over: Partial<{ tags: string[]; evidence_level: string; content: string; created_at: string; confidence: number; id: string; cases_cited: string[] }>) {
  return {
    id: over.id ?? Math.random().toString(),
    evidence_level: over.evidence_level ?? "C",
    confidence: over.confidence ?? 0.7,
    tags: over.tags ?? [],
    cases_cited: over.cases_cited ?? [],
    created_at: over.created_at ?? new Date().toISOString(),
    content: over.content ?? null,
  };
}

function finalT(observations: Array<ReturnType<typeof obs>>, opts: { cooling?: number } = {}) {
  const engine = runEngine(observations, emptyTagMap, { cooling: opts.cooling ?? 0 });
  const rule = aggregateRuleMinimum(observations.map((o) => ({
    tags: o.tags, evidence_level: o.evidence_level, content: o.content,
  })));
  return Math.max(engine.temperature, rule.rule_minimum_temperature);
}

describe("法律 / 监管强证据规则地板", () => {
  it("1. 行政处罚 + 罚款 + 处罚决定书 → final >= 90", () => {
    const r = calculateRuleMinimumTemperature({
      tags: [], evidence_level: "B",
      observation_content: "本案涉及行政处罚，罚款 25 万元，处罚决定书已送达。",
    });
    expect(r.has_regulatory_penalty).toBe(true);
    expect(r.rule_minimum_temperature).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("2. 法院判决 + 违法事实成立 → final >= 90", () => {
    const t = finalT([obs({ evidence_level: "C", content: "法院判决，违法事实成立。" })]);
    expect(t).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("3. 低风险观察 → 新增法律惩罚观察后温度不降反升，且 >= 90", () => {
    const low = [obs({ evidence_level: "C", content: "客服态度一般。" })];
    const tLow = finalT(low);
    const after = [...low, obs({ evidence_level: "A", content: "行政处罚 立案查处 罚款 50 万。" })];
    const tAfter = finalT(after);
    expect(tAfter).toBeGreaterThanOrEqual(tLow);
    expect(tAfter).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("4. AI 输出低温（无标签 / 无证据），强证据仍 >= 90", () => {
    const t = finalT([obs({ evidence_level: "D", tags: [], content: "市监局开出处罚决定。" })]);
    expect(t).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("5. cooling cycle 不能突破规则地板", () => {
    const observations = [obs({ evidence_level: "A", content: "法院判决，违法事实成立。" })];
    const t = finalT(observations, { cooling: -20 });
    expect(t).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("7. 重复 recompute 同输入结果稳定", () => {
    const o = [obs({ evidence_level: "A", content: "行政处罚 罚款" })];
    const a = finalT(o);
    const b = finalT(o);
    const c = finalT(o);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("0 观察 → 不应被识别为舒适", () => {
  it("6. aggregateRuleMinimum 在空输入下返回 20（未测量）", () => {
    const r = aggregateRuleMinimum([]);
    expect(r.rule_minimum_temperature).toBe(20);
    expect(r.has_regulatory_penalty).toBe(false);
  });
});

describe("8. 标签规范化", () => {
  it("中文带空格/斜杠差异归并到同一 canonical", () => {
    expect(normalizeTag("性暴力暗示/迷奸语境")).toBe("性暴力暗示 / 迷奸语境");
    expect(normalizeTag("性暴力暗示 /  迷奸语境")).toBe("性暴力暗示 / 迷奸语境");
    expect(normalizeTag("  性暴力暗示  ")).toBe("性暴力暗示 / 迷奸语境");
  });

  it("英文别名映射到中文 canonical", () => {
    expect(normalizeTag("Objectification")).toBe("女性物化");
    expect(normalizeTag("MALE GAZE")).toBe("男性凝视");
    expect(normalizeTag("victim_blaming")).toBe("受害者归因");
  });

  it("normalizeTags 去重", () => {
    const out = normalizeTags(["女性物化", "objectification", "Objectification"]);
    expect(out).toEqual(["女性物化"]);
  });

  it("规则识别在大小写/空格/斜杠/英文不同情况下都触发", () => {
    const variants = ["objectification", "  女性物化 ", "女性物化"];
    for (const v of variants) {
      const r = calculateRuleMinimumTemperature({
        tags: [v], evidence_level: "A", observation_content: "",
      });
      expect(r.rule_minimum_temperature).toBeGreaterThanOrEqual(65);
    }
  });
});

describe("detectLegalPenalty 覆盖度", () => {
  it("应识别多种关键词", () => {
    for (const kw of [
      "法院判决", "司法裁判", "劳动仲裁", "行政处罚", "市监局",
      "处罚决定书", "处罚告知书", "立案查处", "罚款", "官方通报",
      "违法事实成立", "责令整改", "约谈",
    ]) {
      expect(detectLegalPenalty(`某事件涉及 ${kw}，需复核。`)).toBe(true);
    }
  });

  it("普通投诉文本不触发", () => {
    expect(detectLegalPenalty("客服态度差，体验不好。")).toBe(false);
  });
});

describe("强证据通过 tags 也能触发 >=90 地板", () => {
  it("内容中无关键词、tag 中含'行政处罚' → 仍触发 90", () => {
    const r = aggregateRuleMinimum([
      { tags: ["行政处罚"], evidence_level: "B", content: "无关词。", summary: null, cleaned_content: null },
    ]);
    expect(r.has_regulatory_penalty).toBe(true);
    expect(r.rule_minimum_temperature).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("内容仅有'法院判决'tag → 触发 90", () => {
    const r = aggregateRuleMinimum([
      { tags: ["法院判决"], evidence_level: "C", content: "客服态度差。", summary: null, cleaned_content: null },
    ]);
    expect(r.rule_minimum_temperature).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });

  it("AI 低温 + cooling -20 都不能压低 tag 触发的 90 地板", () => {
    const observations = [obs({ tags: ["行政处罚"], evidence_level: "B", content: "无关词。" })];
    expect(finalT(observations, { cooling: -20 })).toBeGreaterThanOrEqual(LEGAL_PENALTY_MIN_TEMPERATURE);
  });
});

