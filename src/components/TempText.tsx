import { bandOf } from "@/lib/temperature";

interface Props {
  value: number;
  size?: "xs" | "sm" | "md" | "lg";
  /** 显示带符号增量（如 +3°C / -2°C），不按区间着色 */
  delta?: boolean;
  /** 精度，默认 0 位小数 */
  precision?: 0 | 1;
  className?: string;
}

const NUM_SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
};

const UNIT_SIZE: Record<NonNullable<Props["size"]>, string> = {
  xs: "text-[0.6em]",
  sm: "text-[0.55em]",
  md: "text-[0.45em]",
  lg: "text-[0.35em]",
};

/**
 * 统一的内联温度文字。所有列表 / 详情 / 弹窗中出现的温度数值，请使用此组件
 * 以确保字体（font-serif）、字重（bold）、tabular-nums、按区间着色、°C 单位
 * 与首页温度计保持一致。
 */
export function TempText({ value, size = "sm", delta = false, precision = 0, className = "" }: Props) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;

  const num = NUM_SIZE[size];
  const unit = UNIT_SIZE[size];

  if (delta) {
    const sign = v > 0 ? "+" : "";
    const tone = v > 0 ? "text-[color:var(--temp-hot)]" : v < 0 ? "text-[color:var(--temp-cool)]" : "text-muted-foreground";
    return (
      <span className={`font-serif font-bold tabular-nums ${num} ${tone} ${className}`}>
        {sign}
        {v.toFixed(precision)}
        <span className={`ml-0.5 ${unit} text-muted-foreground`}>°C</span>
      </span>
    );
  }

  const band = bandOf(v);
  return (
    <span
      className={`font-serif font-bold tabular-nums ${num} ${className}`}
      style={{ color: band.color }}
    >
      {v.toFixed(precision)}
      <span className={`ml-0.5 ${unit} text-muted-foreground`}>°C</span>
    </span>
  );
}
