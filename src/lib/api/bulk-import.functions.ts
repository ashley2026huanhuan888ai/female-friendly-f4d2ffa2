// 批量导入监管/争议记录（管理员）
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recomputeObjectWithEngine } from "@/lib/api/temperature.functions";
import { calculateRuleMinimumTemperature } from "@/lib/temperature-rules";

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!roles?.length) throw new Error("仅管理员可执行");
}

type ObjectType = "brand" | "product" | "service" | "organization" | "film" | "game" | "show" | "event";

const REGULATORY_KW = [
  "罚单", "处罚", "行政处罚", "市监局", "市场监管", "市监", "监管",
  "官方通报", "约谈", "责令整改", "法院判决", "处罚决定书", "处罚告知书",
  "立案查处", "立案", "罚款", "没收", "公益诉讼",
];

const VERIFIED_KW = ["决定书", "告知书", "http://", "https://", "公告", "通报", "判决"];

// 标签关键词探测（按优先级）
const TAG_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "性暴力暗示 / 迷奸语境", patterns: [/迷奸/, /她不醉/, /灌醉/, /下药/] },
  { tag: "身体羞辱", patterns: [/脚臭/, /胸.*臭/, /内裤.*脏/, /体味/, /丑/] },
  { tag: "性羞辱", patterns: [/荡妇/, /婊/, /骚/] },
  { tag: "受害者归因", patterns: [/穿.*少/, /活该/, /自找/] },
  { tag: "生育规训", patterns: [/不生/, /必须生/, /生育义务/, /剩女/] },
  { tag: "女性物化", patterns: [/物化/, /女人是.*商品/] },
  { tag: "女性工具化", patterns: [/工具/, /躺赢/, /躺赚/] },
  { tag: "能力贬低", patterns: [/女人.*不行/, /女司机/, /头发长见识短/] },
  { tag: "性别角色固化", patterns: [/女人就该/, /男人就该/, /贤妻良母/] },
  { tag: "男性凝视", patterns: [/凝视/, /男人喜欢/] },
  { tag: "容貌规训", patterns: [/必须瘦/, /颜值/, /白瘦幼/] },
  { tag: "低俗擦边营销", patterns: [/擦边/, /低俗/, /性暗示/] },
  { tag: "伪女性友好", patterns: [/独立女性.*买/, /女王节/, /伪赋权/] },
];

export function detectTags(text: string): string[] {
  const found = new Set<string>();
  for (const r of TAG_RULES) {
    if (r.patterns.some((p) => p.test(text))) found.add(r.tag);
  }
  // 广告/营销类违法点兜底加上"性别歧视营销"
  if (/广告|营销|文案|推文|代言/.test(text) && found.size > 0) {
    found.add("性别歧视营销");
  }
  return [...found];
}

export function detectEvidenceA(text: string): boolean {
  return REGULATORY_KW.some((kw) => text.includes(kw));
}

function detectVerified(text: string): "已验证线索" | "待补源" {
  if (/[（(]\s*\d{4}\s*[）)]\s*\S+\s*第?\s*\d+\s*号/.test(text)) return "已验证线索";
  if (VERIFIED_KW.some((kw) => text.includes(kw))) return "已验证线索";
  return "待补源";
}

function extractYear(text: string): number | null {
  const m = text.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function extractAmount(text: string): string | null {
  const patterns = [
    /拟?罚款?\s*([\d.]+\s*[万亿]?元?)/,
    /没收\s*([\d.]+\s*[万亿]?元?)/,
    /罚\s*([\d.]+\s*万)/,
    /([\d.]+\s*万元)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].replace(/\s+/g, "");
  }
  return null;
}

function extractAuthority(text: string): string | null {
  const m = text.match(/([^。\n：:，,（(\s]{2,30}?(?:市监局|市场监管局|监管局|法院|检察院|网信办|工商局))/);
  return m ? m[1] : null;
}

function extractQuoted(text: string): string | null {
  const m = text.match(/[""]([^""]{3,200})[""]/);
  if (m) return m[1];
  const m2 = text.match(/"([^"]{3,200})"/);
  return m2 ? m2[1] : null;
}

function normalizeName(name: string): string {
  return name
    .replace(/[｜|]\s*\d{4}.*$/, "")
    .replace(/\d{4}/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/(有限公司|股份公司|科技有限公司|管理有限公司|集团|公司)$/g, "")
    .replace(/[\s，,。.·•\-—_/\\]+/g, "")
    .trim()
    .toLowerCase();
}

function guessType(name: string, text: string): ObjectType {
  const all = name + " " + text;
  if (/影视|电影|剧/.test(all)) return "film";
  if (/综艺|节目/.test(all)) return "show";
  if (/游戏/.test(all)) return "game";
  if (/事件|案/.test(all)) return "event";
  if (/平台|APP|app|服务/.test(all)) return "service";
  if (/公司|集团|组织|机构|门店/.test(all)) return "organization";
  if (/产品|内衣|奶茶|酒|饮料/.test(all)) return "product";
  return "brand";
}

interface ParsedRecord {
  object_name: string;
  year: number | null;
  object_type: ObjectType;
  regulatory_authority: string | null;
  penalty_amount: string | null;
  penalty_description: string | null;
  violation_summary: string | null;
  original_problematic_text: string | null;
  evidence_level: "A" | "B" | "C" | "D";
  source_status: "已验证线索" | "待补源";
  tags: string[];
  suggested_temperature: number;
  raw_block: string;
  fingerprint: string;
}

function fingerprint(r: { object_name: string; year: number | null; regulatory_authority: string | null; penalty_amount: string | null; violation_summary: string | null }): string {
  return [normalizeName(r.object_name), r.year ?? "", r.regulatory_authority ?? "", r.penalty_amount ?? "", (r.violation_summary ?? "").slice(0, 50)].join("|");
}

function parseBlock(block: string): ParsedRecord | null {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const header = lines[0];
  // 头部：名称｜年份 或 名称 | 年份 或 名称
  const headerMatch = header.match(/^(.+?)\s*[｜|]\s*(.*)$/);
  const object_name = (headerMatch ? headerMatch[1] : header).trim();
  if (!object_name) return null;

  const rest = lines.slice(1).join("\n");
  const fullText = block;

  const year = extractYear(header) ?? extractYear(rest);
  const evidenceA = detectEvidenceA(fullText);
  const authority = extractAuthority(fullText);
  const amount = extractAmount(fullText);

  const penaltyLine = lines.find((l) => /^罚单|^处罚|^监管/.test(l)) ?? null;
  const violationLine = lines.find((l) => /^违法点|^问题|^争议/.test(l)) ?? null;
  const violation_summary = violationLine
    ? violationLine.replace(/^(违法点|问题|争议)\s*[：:]\s*/, "")
    : null;
  const original = extractQuoted(fullText);

  const tags = detectTags(fullText);
  const evidence_level: "A" | "B" | "C" | "D" = evidenceA ? "A" : (violation_summary ? "B" : "C");
  const source_status = detectVerified(fullText);
  const object_type = guessType(object_name, fullText);

  const rule = calculateRuleMinimumTemperature({
    tags,
    evidence_level,
    has_regulatory_penalty: evidenceA,
    observation_content: fullText,
  });

  const rec: ParsedRecord = {
    object_name,
    year,
    object_type,
    regulatory_authority: authority,
    penalty_amount: amount,
    penalty_description: penaltyLine ? penaltyLine.replace(/^(罚单|处罚|监管)\s*[：:]\s*/, "") : null,
    violation_summary,
    original_problematic_text: original,
    evidence_level,
    source_status,
    tags,
    suggested_temperature: rule.rule_minimum_temperature,
    raw_block: block,
    fingerprint: "",
  };
  rec.fingerprint = fingerprint(rec);
  return rec;
}

function splitBlocks(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
}

async function matchObject(name: string): Promise<{ id: string | null; matched_name: string | null; confidence: number }> {
  const norm = normalizeName(name);
  if (!norm) return { id: null, matched_name: null, confidence: 0 };
  // 取候选 ilike
  const { data } = await supabaseAdmin
    .from("objects")
    .select("id, name")
    .ilike("name", `%${norm.slice(0, 6)}%`)
    .limit(20);
  let best: { id: string; name: string; score: number } | null = null;
  for (const o of (data ?? []) as Array<{ id: string; name: string }>) {
    const on = normalizeName(o.name);
    if (!on) continue;
    let score = 0;
    if (on === norm) score = 1.0;
    else if (on.includes(norm) || norm.includes(on)) {
      score = Math.min(on.length, norm.length) / Math.max(on.length, norm.length);
    } else {
      // 字符交集比
      const setA = new Set(on);
      const setB = new Set(norm);
      const inter = [...setA].filter((c) => setB.has(c)).length;
      score = inter / Math.max(setA.size, setB.size);
    }
    if (!best || score > best.score) best = { id: o.id, name: o.name, score };
  }
  if (!best) return { id: null, matched_name: null, confidence: 0 };
  return { id: best.id, matched_name: best.name, confidence: Math.round(best.score * 100) / 100 };
}

// ============= server fns =============

export const previewBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ text: z.string().min(1).max(50000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const blocks = splitBlocks(data.text);
    const records: Array<ParsedRecord & {
      match_status: "匹配成功" | "需人工确认" | "新对象";
      matched_object_id: string | null;
      matched_object_name: string | null;
      match_confidence: number;
      duplicate: boolean;
    }> = [];
    for (const b of blocks) {
      const rec = parseBlock(b);
      if (!rec) continue;
      const m = await matchObject(rec.object_name);
      const match_status: "匹配成功" | "需人工确认" | "新对象" =
        m.confidence >= 0.85 ? "匹配成功" : m.confidence >= 0.6 ? "需人工确认" : "新对象";

      // 重复检测
      let duplicate = false;
      if (m.id) {
        const { data: existing } = await supabaseAdmin
          .from("observations")
          .select("id, content")
          .eq("object_id", m.id)
          .eq("source_status" as never, rec.source_status as never)
          .limit(50);
        for (const o of (existing ?? []) as Array<{ content: string }>) {
          if (o.content.includes(rec.fingerprint.split("|")[4] ?? "____")) {
            duplicate = true;
            break;
          }
        }
      }

      records.push({
        ...rec,
        match_status,
        matched_object_id: m.confidence >= 0.6 ? m.id : null,
        matched_object_name: m.confidence >= 0.6 ? m.matched_name : null,
        match_confidence: m.confidence,
        duplicate,
      });
    }
    return { records };
  });

const CommitItemSchema = z.object({
  object_name: z.string().min(1).max(200),
  object_type: z.enum(["brand", "product", "service", "organization", "film", "game", "show", "event"]),
  matched_object_id: z.string().uuid().nullable(),
  create_new: z.boolean(),
  year: z.number().nullable().optional(),
  regulatory_authority: z.string().nullable().optional(),
  penalty_amount: z.string().nullable().optional(),
  penalty_description: z.string().nullable().optional(),
  violation_summary: z.string().nullable().optional(),
  original_problematic_text: z.string().nullable().optional(),
  evidence_level: z.enum(["A", "B", "C", "D"]),
  source_status: z.enum(["已验证线索", "待补源"]),
  tags: z.array(z.string()).max(20),
  raw_block: z.string(),
  fingerprint: z.string(),
  admin_temperature: z.number().min(20).max(100).nullable().optional(),
});

export const commitBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ items: z.array(CommitItemSchema).min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const summary = {
      total: data.items.length,
      imported: 0,
      skipped: 0,
      created_objects: 0,
      updated_objects: 0,
      need_source_supplement: 0,
      results: [] as Array<{
        object_name: string;
        object_id: string | null;
        final_temperature: number | null;
        triggered_rules: string[];
        evidence_level: string;
        tags: string[];
        note?: string;
      }>,
    };

    for (const it of data.items) {
      try {
        let objectId = it.matched_object_id;
        let created = false;
        if (it.create_new || !objectId) {
          const { data: ins, error } = await supabaseAdmin
            .from("objects")
            .insert({
              name: it.object_name,
              type: it.object_type,
              description: it.violation_summary?.slice(0, 500) ?? null,
              temperature: 20, // 待测评，由 recompute 写入
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          objectId = ins.id;
          created = true;
          summary.created_objects++;
        } else {
          summary.updated_objects++;
        }

        // 组装内容
        const contentParts = [
          it.year ? `年份：${it.year}` : null,
          it.regulatory_authority ? `监管/处罚机构：${it.regulatory_authority}` : null,
          it.penalty_amount ? `处罚金额：${it.penalty_amount}` : null,
          it.penalty_description ? `处罚详情：${it.penalty_description}` : null,
          it.violation_summary ? `违法点：${it.violation_summary}` : null,
          it.original_problematic_text ? `原始问题文案："${it.original_problematic_text}"` : null,
          `——`,
          it.raw_block,
        ].filter(Boolean);
        const content = contentParts.join("\n");

        // 当前温度
        const { data: curObj } = await supabaseAdmin
          .from("objects").select("temperature").eq("id", objectId!).single();
        const current = curObj ? Number(curObj.temperature) : 20;

        const { error: oErr } = await supabaseAdmin.from("observations").insert({
          object_id: objectId!,
          user_id: context.userId,
          content,
          cleaned_content: it.violation_summary ?? content.slice(0, 500),
          summary: it.violation_summary ?? it.object_name,
          evidence_level: it.evidence_level,
          tags: it.tags as never,
          confidence: it.evidence_level === "A" ? 0.95 : it.evidence_level === "B" ? 0.8 : 0.6,
          status: "approved",
          admin_note: `批量导入 · ${it.source_status}`,
          source_status: it.source_status,
          scene: it.regulatory_authority ?? "管理员批量导入",
        } as never);
        if (oErr) throw new Error(oErr.message);

        // 重新计算温度（AI 引擎 + 规则最低）
        const result = await recomputeObjectWithEngine(objectId!, "bulk_import", null, context.userId);

        let final = result?.temperature ?? 24;
        // 强制不降温：max(current, ai_or_rule, admin)
        if (!created && current > final) {
          final = current;
        }
        if (it.admin_temperature && it.admin_temperature > final) {
          final = it.admin_temperature;
        }
        if (final !== (result?.temperature ?? 24)) {
          await supabaseAdmin.from("objects").update({ temperature: final } as never).eq("id", objectId!);
        }

        if (it.source_status === "待补源") summary.need_source_supplement++;
        summary.imported++;
        const bd = (result?.breakdown ?? {}) as Record<string, unknown>;
        summary.results.push({
          object_name: it.object_name,
          object_id: objectId,
          final_temperature: final,
          triggered_rules: Array.isArray(bd.triggered_rules) ? (bd.triggered_rules as string[]) : [],
          evidence_level: it.evidence_level,
          tags: it.tags,
        });
      } catch (e) {
        summary.skipped++;
        summary.results.push({
          object_name: it.object_name,
          object_id: null,
          final_temperature: null,
          triggered_rules: [],
          evidence_level: it.evidence_level,
          tags: it.tags,
          note: (e as Error).message,
        });
      }
    }

    return summary;
  });
