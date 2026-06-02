// 女性体验温度 AI 引擎 V1
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  FEMINIST_TAGS,
  TAG_WEIGHTS,
  EVIDENCE_STRENGTH,
  computeImpact,
} from "@/lib/temperature";
import { recomputeObjectWithEngine } from "@/lib/api/temperature.functions";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface AnalyzeResult {
  cleaned_content: string;
  facts: string[];
  evidence_level: "A" | "B" | "C" | "D";
  tags: string[];
  confidence: number;
  summary: string;
  reason: string;
  principles_matched: string[];
  cases_cited: string[];
  explanation: string;
}

// 检索可被 AI 引用的知识：活跃原则 + 已发布案例
async function loadKnowledgeContext() {
  const [pRes, cRes] = await Promise.all([
    supabaseAdmin.from("principles" as never).select("code, name, description")
      .eq("active", true).order("display_order"),
    supabaseAdmin.from("knowledge_cases" as never)
      .select("code, title, summary, polarity, tags")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  return {
    principles: (pRes.data ?? []) as { code: string; name: string; description: string | null }[],
    cases: (cRes.data ?? []) as { code: string; title: string; summary: string; polarity: string; tags: string[] }[],
  };
}

async function callAIAnalyze(
  content: string,
  scene: string | null,
  screenshot: string | null,
  ref: string | null,
): Promise<AnalyzeResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");

  const kb = await loadKnowledgeContext();
  const principleCodes = kb.principles.map((p) => p.code);
  const caseCodes = kb.cases.map((c) => c.code);

  const sys = `你是「女性友好测评」平台的知识引擎分析器。你不是法官，不做道德裁决。
你必须基于平台知识库（原则 + 标签 + 案例）进行可解释、可追溯的分析。

【知识库 · 原则 Principles】（仅可引用下列 code）
${kb.principles.map((p) => `- ${p.code} 「${p.name}」${p.description ?? ""}`).join("\n")}

【知识库 · 一级标签】（仅可使用以下中文名）
${FEMINIST_TAGS.join("、")}

【知识库 · 已发布案例】（仅可引用下列 code，按相关性挑选 0-3 条）
${kb.cases.map((c) => `- ${c.code} [${c.polarity}] ${c.title} —— ${c.summary} (tags: ${c.tags.join(",") || "-"})`).join("\n") || "（暂无案例）"}

【分析步骤】
1) 内容清洗：删除情绪化辱骂、广告、刷屏；保留事实与观察。
2) 提取事实：每条 ≤30 字。
3) 匹配知识库：找到本次观察对应的 principles_matched（原则 code）与 cases_cited（案例 code）。
4) 标签识别：从一级标签集合中选择。
5) 证据等级 A/B/C/D：A=有原始截图/台词/广告原文；B=可核验描述；C=主观感受；D=辱骂或纯情绪（不参与计算）。
6) 置信度 0-1。
7) summary（≤80字）与 explanation（≤120字 可解释性说明，须援引匹配到的原则/案例 code，例如 "匹配原则 non_objectification，与案例 KB-00003 模式一致"）。
8) reason：一句话给管理员看的判定理由。

【硬规则】
- 禁止使用"厌女""恶心""有毒""垃圾"等情绪化词汇。
- 禁止输出"该品牌厌女"；允许输出"观察中出现较高比例的女性物化讨论"。
- principles_matched 与 cases_cited 中的 code 必须严格来自上方知识库列表，未匹配请留空数组。`;

  const user = `观察内容：${content}
${scene ? `场景：${scene}` : ""}
${screenshot ? `附有截图证据：${screenshot}` : ""}
${ref ? `参考链接：${ref}` : ""}`;

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      tools: [{
        type: "function",
        function: {
          name: "submit_analysis",
          description: "返回结构化分析结果",
          parameters: {
            type: "object",
            properties: {
              cleaned_content: { type: "string" },
              facts: { type: "array", items: { type: "string" } },
              evidence_level: { type: "string", enum: ["A", "B", "C", "D"] },
              tags: { type: "array", items: { type: "string", enum: [...FEMINIST_TAGS] } },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              summary: { type: "string" },
              reason: { type: "string" },
              principles_matched: {
                type: "array",
                items: principleCodes.length ? { type: "string", enum: principleCodes } : { type: "string" },
              },
              cases_cited: {
                type: "array",
                items: caseCodes.length ? { type: "string", enum: caseCodes } : { type: "string" },
              },
              explanation: { type: "string", description: "可解释性说明，需援引 code" },
            },
            required: ["cleaned_content","facts","evidence_level","tags","confidence","summary","reason","principles_matched","cases_cited","explanation"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_analysis" } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("AI 请求过于频繁，请稍后再试");
    if (res.status === 402) throw new Error("AI 额度已用尽，请联系管理员");
    throw new Error(`AI 调用失败 ${res.status}`);
  }
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI 未返回结果");
  return JSON.parse(args);
}

interface SummaryResult {
  summary: string;
  top_tags: { tag: string; count: number }[];
  evidence_distribution: Record<string, number>;
}

async function callAIObjectSummary(
  objectName: string,
  observations: { summary: string; tags: string[]; evidence_level: string; impact_score: number }[],
): Promise<SummaryResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");

  // 标签 / 证据分布
  const tagCount = new Map<string, number>();
  const evDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const o of observations) {
    evDist[o.evidence_level] = (evDist[o.evidence_level] ?? 0) + 1;
    for (const t of o.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const top_tags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  const sys = `你为「女性体验温度」平台生成对象级总结。中立、克制、不审判。
禁止："厌女""恶心""有毒"等情绪化词汇。
使用："观察显示""讨论集中于""反馈主要涉及"等表达。
200 字以内，覆盖：主要议题分布、证据强度概览、是否存在系统性模式。`;

  const user = `对象：${objectName}
有效观察数（A/B/C 合计）：${observations.filter((o) => o.evidence_level !== "D").length}
证据分布：A=${evDist.A} B=${evDist.B} C=${evDist.C} D=${evDist.D}
Top 标签：${top_tags.map((t) => `${t.tag}(${t.count})`).join("、") || "无"}

观察摘要样本（最多 20 条）：
${observations.slice(0, 20).map((o, i) => `${i + 1}. [${o.evidence_level}|分${o.impact_score}|${o.tags.join(",")}] ${o.summary}`).join("\n")}`;

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      tools: [{
        type: "function",
        function: {
          name: "submit_summary",
          parameters: {
            type: "object",
            properties: { summary: { type: "string" } },
            required: ["summary"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_summary" } },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("AI 请求过于频繁");
    if (res.status === 402) throw new Error("AI 额度已用尽");
    throw new Error(`AI 调用失败 ${res.status}`);
  }
  const json = await res.json();
  const args = JSON.parse(json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
  return { summary: args.summary, top_tags, evidence_distribution: evDist };
}

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!roles?.length) throw new Error("仅管理员可执行");
}

async function writeAuditLog(
  actor: string, action: string, target_type: string, target_id: string | null,
  before: unknown, after: unknown, reason?: string | null,
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor, action, target_type, target_id,
    before: before as never, after: after as never, reason: reason ?? null,
  });
}

// 内部温度重算（用于自动通过 / 审核通过后调用，无权限检查）
async function recomputeObjectInternal(object_id: string): Promise<number | null> {
  const { data: obj } = await supabaseAdmin
    .from("objects").select("id, name, frozen").eq("id", object_id).single();
  if (!obj || obj.frozen) return null;
  const { data: obs } = await supabaseAdmin
    .from("observations")
    .select("summary, cleaned_content, content, evidence_level, tags, impact_score")
    .eq("object_id", object_id).eq("status", "approved");
  const list = (obs ?? []).map((o) => ({
    summary: o.summary || o.cleaned_content || o.content?.slice(0, 80) || "",
    evidence_level: (o.evidence_level ?? "C") as string,
    tags: (o.tags as string[]) ?? [],
    impact_score: Number(o.impact_score) || 0,
  }));
  if (list.length === 0) {
    await supabaseAdmin.from("objects").update({
      temperature: 24, ai_summary: "暂无足够观察生成总结。", top_tags: [], observation_count: 0,
      heat_sources: [] as never, cooling_sources: [] as never,
    } as never).eq("id", object_id);
    return 24;
  }
  // 使用温度智能引擎重算（写入 temperature_events 与 heat/cooling sources）
  const eng = await recomputeObjectWithEngine(object_id, "observation_approved", null, null);
  const temperature = eng?.temperature ?? 24;
  let summary = "";
  let top_tags: { tag: string; count: number }[] = [];
  let evidence_distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  try {
    const r = await callAIObjectSummary(obj.name, list);
    summary = r.summary; top_tags = r.top_tags; evidence_distribution = r.evidence_distribution;
  } catch { /* tolerate AI failure */ }
  await supabaseAdmin.from("objects").update({
    ai_summary: summary || null, top_tags,
    observation_count: list.filter((o) => o.evidence_level !== "D").length,
  }).eq("id", object_id);
  await supabaseAdmin.from("analysis_logs").insert({
    object_id, snapshot: { temperature, top_tags, evidence_distribution, obs_count: list.length },
  });
  return temperature;
}

// ===== AI 风险审查 =====
async function callAIRiskCheck(content: string): Promise<{
  risk_level: "low" | "medium" | "high";
  reasons: string[];
  suggested_action: "approve" | "review" | "reject";
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");
  const sys = `你是平台内容风险审查员。判断用户提交的观察是否存在以下风险：
abuse(辱骂/人身攻击) / ad(广告) / spam(刷屏/重复无意义) / extreme(极端情绪宣泄) / political(政治内容) / illegal(违法) / defamation(诽谤)。
风险等级：low=正常观察；medium=存在争议但可审；high=涉嫌前述严重情形。
suggested_action：approve(明显正常)/review(需人工审)/reject(强烈建议拒绝)。`;
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: sys }, { role: "user", content }],
      tools: [{
        type: "function",
        function: {
          name: "risk",
          parameters: {
            type: "object",
            properties: {
              risk_level: { type: "string", enum: ["low", "medium", "high"] },
              reasons: { type: "array", items: { type: "string", enum: ["abuse","ad","spam","extreme","political","illegal","defamation"] } },
              suggested_action: { type: "string", enum: ["approve", "review", "reject"] },
            },
            required: ["risk_level", "reasons", "suggested_action"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "risk" } },
    }),
  });
  if (!res.ok) return { risk_level: "low", reasons: [], suggested_action: "review" };
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { risk_level: "low", reasons: [], suggested_action: "review" };
  return JSON.parse(args);
}

// ===== 提交观察并触发 AI 分析 =====
export const submitObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      object_id: z.string().uuid(),
      content: z.string().trim().min(10).max(2000),
      scene: z.string().max(200).optional().nullable(),
      screenshot_url: z.string().url().max(500).optional().nullable(),
      reference_url: z.string().url().max(500).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // 1. 限额检查
    const { data: lim } = await supabaseAdmin.rpc("check_user_submit_limit", {
      _user: userId, _object: data.object_id,
    });
    const limit = lim as { allowed: boolean; total_24h: number; same_object_24h: number } | null;
    if (limit && !limit.allowed) {
      if (limit.same_object_24h >= 1) throw new Error("同一对象 24 小时内仅可提交 1 条观察");
      throw new Error("24 小时内最多提交 3 条观察");
    }

    // 2-4. 并行：AI 风险审查 / AI 结构化分析 / 查重候选 / 用户档案
    const [risk, a, existingRes, profileRes] = await Promise.all([
      callAIRiskCheck(data.content),
      callAIAnalyze(data.content, data.scene ?? null, data.screenshot_url ?? null, data.reference_url ?? null),
      supabaseAdmin
        .from("observations")
        .select("id, cleaned_content, content")
        .eq("object_id", data.object_id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("profiles").select("auto_approve").eq("id", userId).maybeSingle(),
    ]);

    // 3. 简单相似度查重（2-gram Jaccard >= 0.8）
    let duplicate_of: string | null = null;
    let similarity_score: number | null = null;
    const existing = existingRes.data;
    if (existing?.length) {
      const norm = (s: string) => new Set(s.toLowerCase().replace(/[\s\p{P}]+/gu, "").match(/.{1,2}/g) ?? []);
      const aSet = norm(data.content);
      for (const e of existing) {
        const b = norm(e.cleaned_content || e.content || "");
        if (b.size === 0) continue;
        let inter = 0;
        aSet.forEach((x) => { if (b.has(x)) inter++; });
        const jac = inter / (aSet.size + b.size - inter);
        if (jac > (similarity_score ?? 0)) { similarity_score = jac; duplicate_of = e.id; }
      }
      if ((similarity_score ?? 0) < 0.8) { duplicate_of = null; }
    }

    const impact = computeImpact(a.tags, a.evidence_level, a.confidence);

    // 5. 自动通过判定
    const profile = profileRes.data;

    const canAuto =
      profile?.auto_approve === true &&
      risk.risk_level === "low" &&
      !duplicate_of &&
      a.evidence_level !== "D";
    const status = canAuto ? "approved" : "pending";

    const { data: inserted, error } = await supabaseAdmin
      .from("observations")
      .insert({
        object_id: data.object_id,
        user_id: userId,
        content: data.content,
        scene: data.scene ?? null,
        screenshot_url: data.screenshot_url ?? null,
        reference_url: data.reference_url ?? null,
        cleaned_content: a.cleaned_content,
        facts: a.facts,
        summary: a.summary,
        evidence_level: a.evidence_level,
        tags: a.tags,
        confidence: a.confidence,
        impact_score: impact,
        status,
        risk_level: risk.risk_level,
        risk_reasons: risk.reasons,
        duplicate_of,
        similarity_score,
        principles_matched: a.principles_matched ?? [],
        cases_cited: a.cases_cited ?? [],
        explanation: a.explanation ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // 自动通过则立即重算温度
    if (status === "approved") {
      void recomputeObjectInternal(data.object_id).catch(() => {});
      await supabaseAdmin.rpc("apply_reputation_delta", {
        _user: userId, _delta: data.reference_url ? 10 : 5,
        _reason: "auto_approve", _obs: inserted.id,
      });
    }

    return {
      id: inserted.id,
      status,
      risk_level: risk.risk_level,
      risk_reasons: risk.reasons,
      duplicate_of,
      similarity_score,
      evidence_level: a.evidence_level,
      tags: a.tags,
      impact_score: impact,
      confidence: a.confidence,
      summary: a.summary,
      reason: a.reason,
      limit_info: limit,
    };
  });

// ===== 重新生成单条观察的 AI 分析（admin）=====
export const regenerateObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: obs } = await supabaseAdmin
      .from("observations")
      .select("content, scene, screenshot_url, reference_url, object_id")
      .eq("id", data.id).single();
    if (!obs) throw new Error("观察不存在");
    const a = await callAIAnalyze(obs.content, obs.scene, obs.screenshot_url, obs.reference_url);
    const impact = computeImpact(a.tags, a.evidence_level, a.confidence);
    await supabaseAdmin.from("observations").update({
      cleaned_content: a.cleaned_content,
      facts: a.facts,
      summary: a.summary,
      evidence_level: a.evidence_level,
      tags: a.tags,
      confidence: a.confidence,
      impact_score: impact,
      principles_matched: a.principles_matched ?? [],
      cases_cited: a.cases_cited ?? [],
      explanation: a.explanation ?? null,
    } as never).eq("id", data.id);
    return { ok: true, evidence_level: a.evidence_level, tags: a.tags, impact_score: impact };
  });

// ===== 管理员手动调整观察（标签 / 证据 / 摘要）=====
export const updateObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      tags: z.array(z.string()).max(10).optional(),
      evidence_level: z.enum(["A", "B", "C", "D"]).optional(),
      summary: z.string().max(200).optional(),
      confidence: z.number().min(0).max(1).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: cur } = await supabaseAdmin.from("observations")
      .select("tags, evidence_level, confidence").eq("id", data.id).single();
    if (!cur) throw new Error("观察不存在");
    const tags = data.tags ?? (cur.tags as string[] ?? []);
    const ev = data.evidence_level ?? cur.evidence_level ?? "C";
    const conf = data.confidence ?? Number(cur.confidence) ?? 0.7;
    const impact = computeImpact(tags, ev, conf);
    const patch = {
      tags, evidence_level: ev, confidence: conf, impact_score: impact,
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
    };
    const { error } = await supabaseAdmin.from("observations").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, impact_score: impact };
  });

// ===== 删除观察（admin）=====
export const deleteObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("observations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== 重新生成对象温度（admin）=====
export const recomputeTemperature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      object_id: z.string().uuid(),
      manual_temperature: z.number().min(20).max(100).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.manual_temperature !== undefined) {
      const { data: before } = await supabaseAdmin
        .from("objects").select("temperature").eq("id", data.object_id).single();
      await supabaseAdmin.from("objects").update({ temperature: data.manual_temperature })
        .eq("id", data.object_id);
      await supabaseAdmin.from("analysis_logs").insert({
        object_id: data.object_id,
        snapshot: { manual: true, temperature: data.manual_temperature },
      });
      await writeAuditLog(context.userId, "manual_temperature", "object", data.object_id,
        before, { temperature: data.manual_temperature }, "管理员手动覆盖");
      return { temperature: data.manual_temperature };
    }
    const t = await recomputeObjectInternal(data.object_id);
    if (t === null) throw new Error("对象不存在或已冻结");
    return { temperature: t };
  });

// ===== 冻结 / 解冻对象温度 =====
export const freezeObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ object_id: z.string().uuid(), frozen: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("objects").update({ frozen: data.frozen }).eq("id", data.object_id);
    await writeAuditLog(context.userId, data.frozen ? "freeze" : "unfreeze", "object", data.object_id, null, null);
    return { ok: true };
  });

// ===== 隐藏 / 显示对象 =====
export const hideObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ object_id: z.string().uuid(), hidden: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("objects")
      .update({ hidden: data.hidden })
      .eq("id", data.object_id);
    await writeAuditLog(context.userId, data.hidden ? "hide" : "show", "object", data.object_id, null, null);
    return { ok: true };
  });

// ===== 删除对象（admin）=====
export const deleteObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ object_id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: before } = await supabaseAdmin.from("objects").select("*").eq("id", data.object_id).single();
    await supabaseAdmin.from("observations").delete().eq("object_id", data.object_id);
    await supabaseAdmin.from("objects").delete().eq("id", data.object_id);
    await writeAuditLog(context.userId, "delete", "object", data.object_id, before, null, data.reason ?? null);
    return { ok: true };
  });

// ===== 合并对象（将 source 的观察迁移至 target，source 标记 merged_into）=====
export const mergeObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      source_id: z.string().uuid(), target_id: z.string().uuid(), reason: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.source_id === data.target_id) throw new Error("源对象与目标相同");
    await supabaseAdmin.from("observations").update({ object_id: data.target_id }).eq("object_id", data.source_id);
    await supabaseAdmin.from("objects").update({ merged_into: data.target_id, hidden: true })
      .eq("id", data.source_id);
    await writeAuditLog(context.userId, "merge", "object", data.source_id,
      { source_id: data.source_id }, { target_id: data.target_id }, data.reason ?? null);
    await recomputeObjectInternal(data.target_id).catch(() => {});
    return { ok: true };
  });

// ===== 修改对象分类 =====
export const updateObjectCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      object_id: z.string().uuid(),
      type: z.enum(["brand", "product", "service", "organization", "film", "game", "show", "event"]).optional(),
      category: z.string().max(80).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {};
    if (data.type) patch.type = data.type;
    if (data.category !== undefined) patch.category = data.category || null;
    if (!Object.keys(patch).length) return { ok: true };
    await supabaseAdmin.from("objects").update(patch as never).eq("id", data.object_id);
    await writeAuditLog(context.userId, "update_category", "object", data.object_id, null, patch);
    return { ok: true };
  });

// ===== 管理员审核观察 =====
export const reviewObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      rejection_reason: z.enum(["too_short","no_facts","pure_emotion","duplicate","advertisement","personal_attack","defamation","off_topic"]).optional(),
      note: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: before } = await supabaseAdmin.from("observations")
      .select("user_id, object_id, status, reference_url").eq("id", data.id).single();
    if (!before) throw new Error("观察不存在");
    if (data.action === "reject" && !data.rejection_reason) throw new Error("驳回需选择原因");
    const status = data.action === "approve" ? "approved" : "rejected";
    const { error } = await supabaseAdmin
      .from("observations")
      .update({
        status, admin_note: data.note ?? null,
        rejection_reason: data.action === "reject" ? data.rejection_reason : null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // 信誉变更
    let delta = 0; let reason = "review";
    if (data.action === "approve") {
      delta = before.reference_url ? 10 : 5; reason = "approved";
    } else {
      const map: Record<string, number> = {
        advertisement: -20, personal_attack: -30, defamation: -30,
        too_short: -10, no_facts: -10, pure_emotion: -10, duplicate: -10, off_topic: -10,
      };
      delta = map[data.rejection_reason!] ?? -10;
      reason = data.rejection_reason!;
    }
    await supabaseAdmin.rpc("apply_reputation_delta", {
      _user: before.user_id, _delta: delta, _reason: reason, _obs: data.id,
    });

    await writeAuditLog(context.userId, `review_${data.action}`, "observation", data.id,
      { status: before.status }, { status, rejection_reason: data.rejection_reason }, data.note ?? null);

    if (data.action === "approve") {
      void recomputeObjectInternal(before.object_id).catch(() => {});
    }
    return { object_id: before.object_id };
  });

// ===== 调整用户信誉（admin）=====
export const adjustReputation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_id: z.string().uuid(),
      delta: z.number().int().min(-100).max(100),
      reason: z.string().min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.rpc("apply_reputation_delta", {
      _user: data.user_id, _delta: data.delta, _reason: `admin_adjust:${data.reason}`, _obs: null as never,
    });
    await writeAuditLog(context.userId, "adjust_reputation", "user", data.user_id, null, { delta: data.delta }, data.reason);
    return { ok: true };
  });

// ===== Admin Analytics =====
export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [obs30, approved30, high30, objCount, topObj, topUsers] = await Promise.all([
      supabaseAdmin.from("observations").select("id, status, created_at, risk_level", { count: "exact" }).gte("created_at", since),
      supabaseAdmin.from("observations").select("id", { count: "exact", head: true }).gte("created_at", since).eq("status", "approved"),
      supabaseAdmin.from("observations").select("id", { count: "exact", head: true }).gte("created_at", since).eq("risk_level", "high"),
      supabaseAdmin.from("objects").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("objects").select("id, name, temperature, observation_count").order("observation_count", { ascending: false }).limit(5),
      supabaseAdmin.from("profiles").select("id, email, display_name, reputation").order("reputation", { ascending: false }).limit(5),
    ]);
    const total30 = obs30.count ?? 0;
    const approveRate = total30 > 0 ? Math.round(((approved30.count ?? 0) / total30) * 100) : 0;
    return {
      observations_30d: total30,
      approve_rate: approveRate,
      high_risk_30d: high30.count ?? 0,
      objects_total: objCount.count ?? 0,
      top_objects: topObj.data ?? [],
      top_users: topUsers.data ?? [],
    };
  });

// ===== 审计日志列表 =====
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });



// ===== 管理员从申请创建对象 =====
export const createObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(1).max(120),
      type: z.enum(["brand", "product", "service", "organization", "film", "game", "show", "event"]),
      description: z.string().max(1000).optional(),
      request_id: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: obj, error } = await supabaseAdmin
      .from("objects")
      .insert({ name: data.name, type: data.type, description: data.description ?? null })
      .select("id").single();
    if (error) throw new Error(error.message);
    if (data.request_id) {
      await supabaseAdmin.from("object_requests").update({ status: "approved" }).eq("id", data.request_id);
    }
    return { id: obj.id };
  });

// ===== 拒绝对象申请 =====
export const rejectRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), note: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("object_requests").update({ status: "rejected", admin_note: data.note ?? null }).eq("id", data.id);
    return { ok: true };
  });

// ===== 用户：申请评估对象 =====
export const requestObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      requested_name: z.string().trim().min(1).max(120),
      requested_type: z.enum(["brand", "product", "service", "organization", "film", "game", "show", "event"]),
      reason: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("object_requests").insert({
      requested_name: data.requested_name,
      requested_type: data.requested_type,
      reason: data.reason ?? null,
      requester_id: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== 首位管理员自助声明 =====
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("已存在管理员，无法自助声明");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 暴露权重元数据给前端
export { TAG_WEIGHTS, EVIDENCE_STRENGTH };
