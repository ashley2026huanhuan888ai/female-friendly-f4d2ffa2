// 用户信誉等级
export const REPUTATION_LEVELS = [
  { key: "new_user", label: "新用户", min: 0 },
  { key: "trusted_user", label: "可信用户", min: 80 },
  { key: "contributor", label: "贡献者", min: 150 },
  { key: "research_contributor", label: "研究贡献者", min: 300 },
] as const;

export function reputationLevel(rep: number) {
  return [...REPUTATION_LEVELS].reverse().find((l) => rep >= l.min) ?? REPUTATION_LEVELS[0];
}

export const REPUTATION_DELTA = {
  approved: 5,
  approved_with_evidence: 10,
  rejected: -10,
  advertisement: -20,
  personal_attack: -30,
} as const;

export const REJECTION_REASONS: { value: string; label: string; rep: number }[] = [
  { value: "too_short", label: "内容过短", rep: -10 },
  { value: "no_facts", label: "缺少观察事实", rep: -10 },
  { value: "pure_emotion", label: "纯情绪表达", rep: -10 },
  { value: "duplicate", label: "重复内容", rep: -10 },
  { value: "advertisement", label: "广告内容", rep: -20 },
  { value: "personal_attack", label: "人身攻击", rep: -30 },
  { value: "defamation", label: "涉嫌造谣", rep: -30 },
  { value: "off_topic", label: "无关内容", rep: -10 },
];

export const RISK_LABEL: Record<string, string> = { low: "低", medium: "中", high: "高" };
