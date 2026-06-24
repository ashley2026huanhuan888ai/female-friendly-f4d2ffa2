import { Fragment, type ReactNode } from "react";

// 按长度降序，避免短词先匹配吃掉长词
const KEYWORDS = [
  "传统性别角色",
  "受害者有罪论",
  "结构性歧视",
  "系统性歧视",
  "性别刻板印象",
  "权力不对等",
  "母职惩罚",
  "贞洁叙事",
  "容貌焦虑",
  "身材焦虑",
  "刻板印象",
  "性别角色",
  "权力差",
  "客体化",
  "工具化",
  "边缘化",
  "污名化",
  "浪漫化",
  "合理化",
  "美化",
  "强化",
  "固化",
  "物化",
  "规训",
  "厌女",
  "仇女",
  "男凝",
  "凝视",
  "爹味",
  "噤声",
  "消音",
  "沉默",
].sort((a, b) => b.length - a.length);

const PATTERN = new RegExp(`(${KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");

export function highlightKeywords(text: string | null | undefined): ReactNode {
  if (!text) return text ?? null;
  const parts = text.split(PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
