import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bandOf, BANDS } from "./temperature";

// TempText 通过 bandOf() 选取 `var(--temp-*)` 作为内联 color。
// 因此颜色在浅 / 深主题下保持一致只需保证两件事：
//   1. bandOf 对所有数值（含小数边界）返回正确的区间，并指向 --temp-* 变量
//   2. styles.css 同时在 :root 与 .dark 下定义了所有 --temp-* 变量
// 此文件覆盖以上两点，使 TempText 在所有页面（首页、对象详情、档案、投稿、动态卡片等）
// 的颜色行为可被自动校验。

describe("bandOf 区间映射 (TempText 配色来源)", () => {
  const cases: Array<[number, (typeof BANDS)[number]["band"]]> = [
    [20, "comfort"],
    [24, "comfort"],
    [28, "comfort"],
    [28.5, "minor"], // 小数边界：此前会错误落回 comfort
    [29, "minor"],
    [40, "minor"],
    [40.5, "notable"],
    [41, "notable"],
    [60, "notable"],
    [60.5, "high"],
    [80, "high"],
    [80.5, "critical"],
    [100, "critical"],
    [-5, "comfort"], // clamp 下界
    [200, "critical"], // clamp 上界
  ];

  for (const [value, expected] of cases) {
    it(`value=${value} → ${expected}`, () => {
      expect(bandOf(value).band).toBe(expected);
    });
  }

  it("每个区间均使用 var(--temp-*) 颜色 token", () => {
    for (const b of BANDS) {
      expect(b.color).toMatch(/^var\(--temp-[a-z]+\)$/);
    }
  });
});

describe("styles.css 暗色模式 TempText 颜色覆盖", () => {
  const css = readFileSync(resolve(__dirname, "../styles.css"), "utf-8");
  const tokens = ["--temp-cool", "--temp-neutral", "--temp-warm", "--temp-hot", "--temp-critical"];

  // 提取 :root 与 .dark 块（简单括号匹配，足以应付当前 styles.css 结构）
  function extractBlock(selector: string): string {
    const re = new RegExp(`${selector.replace(/[.]/g, "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`);
    const m = css.match(re);
    if (!m) throw new Error(`找不到 ${selector} 选择器块`);
    return m[1];
  }

  const rootBlock = extractBlock(":root");
  const darkBlock = extractBlock("\\.dark");

  for (const tok of tokens) {
    it(`:root 定义 ${tok}`, () => {
      expect(rootBlock).toMatch(new RegExp(`${tok}\\s*:`));
    });
    it(`.dark 覆写 ${tok}（保证深色模式有独立颜色）`, () => {
      expect(darkBlock).toMatch(new RegExp(`${tok}\\s*:`));
    });
  }

  it("浅 / 深主题下的颜色值不同（避免暗色模式直接复用浅色）", () => {
    for (const tok of tokens) {
      const light = rootBlock.match(new RegExp(`${tok}\\s*:\\s*([^;]+);`))?.[1].trim();
      const dark = darkBlock.match(new RegExp(`${tok}\\s*:\\s*([^;]+);`))?.[1].trim();
      expect(light, `${tok} 浅色未定义`).toBeTruthy();
      expect(dark, `${tok} 深色未定义`).toBeTruthy();
      expect(dark).not.toBe(light);
    }
  });
});
