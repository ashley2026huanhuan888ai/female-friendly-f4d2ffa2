// AI 分析 server functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FEMINIST_TAGS, EVIDENCE_WEIGHT } from "@/lib/temperature";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface AnalyzeResult {
  cleaned_content: string;
  evidence_level: "A" | "B" | "C" | "D";
  tags: string[];
  reason: string;
}

async function callAIAnalyze(content: string, scene: string | null, screenshot: string | null, ref: string | null): Promise<AnalyzeResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");

  const sys = `你是「女性体验温度」平台的内容分析助手。
任务：对用户提交的观察内容进行结构化分析。

证据等级判定：
- A：附有截图/视频/广告原文/台词等原始证据
- B：详细描述（时间地点情境清晰）
- C：简单感受、模糊描述
- D：辱骂、人身攻击、与议题无关 — 此类不参与分析

可识别标签（仅从下列选择）：${FEMINIST_TAGS.join("、")}

输出要求：
1. cleaned_content：去除情绪化和攻击性表达，保留事实描述
2. evidence_level：A/B/C/D 之一
3. tags：识别到的标签数组（无则空数组）
4. reason：一句话说明判定理由`;

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
          description: "返回分析结果",
          parameters: {
            type: "object",
            properties: {
              cleaned_content: { type: "string" },
              evidence_level: { type: "string", enum: ["A", "B", "C", "D"] },
              tags: { type: "array", items: { type: "string", enum: [...FEMINIST_TAGS] } },
              reason: { type: "string" },
            },
            required: ["cleaned_content", "evidence_level", "tags", "reason"],
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

async function callAISummary(objectName: string, observations: { content: string; tags: string[]; evidence_level: string }[]): Promise<{ summary: string; temperature: number; top_tags: { tag: string; count: number }[] }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");

  // 标签统计
  const tagCount = new Map<string, number>();
  let weightSum = 0;
  let weighted = 0;
  for (const o of observations) {
    const w = EVIDENCE_WEIGHT[o.evidence_level] ?? 0;
    if (w === 0) continue;
    weightSum += w;
    for (const t of o.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + w);
    weighted += w * (o.tags.length > 0 ? 1 : 0.3);
  }
  const top_tags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count: Math.round(count * 10) / 10 }));

  // 标签集中度（衡量争议密度，非简单数量）
  const concentration = weightSum > 0 ? weighted / weightSum : 0;
  const tagDiversity = tagCount.size;

  const sys = `你是「女性体验温度」平台的总结生成助手。
基于已经过审核的观察记录，生成对该评估对象的客观总结，并给出温度值 20-100：
- 20-28 舒适区（几乎无争议）
- 29-40 轻微争议
- 41-60 明显争议
- 61-80 高温争议
- 81-100 极高温争议（系统性、反复出现的严重议题）

温度判定依据：
1. 证据强度（A 级证据权重最高）
2. 标签多样性（多个独立议题反映系统性问题）
3. 议题严重程度
重要：评论数量不直接影响温度，只看质量与集中度。

总结要 200 字以内，中立、克制、不审判。`;

  const user = `对象：${objectName}
有效观察数：${observations.filter(o => o.evidence_level !== "D").length}
标签集中度参考：${concentration.toFixed(2)}（0-1，越高争议越集中）
标签多样性：${tagDiversity} 种
Top 标签：${top_tags.map(t => `${t.tag}(${t.count})`).join("、") || "无"}

观察样本（最多 20 条）：
${observations.slice(0, 20).map((o, i) => `${i + 1}. [${o.evidence_level}|${o.tags.join(",")}] ${o.content.slice(0, 200)}`).join("\n")}`;

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
            properties: {
              summary: { type: "string" },
              temperature: { type: "number", minimum: 20, maximum: 100 },
            },
            required: ["summary", "temperature"],
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
  return { summary: args.summary, temperature: args.temperature, top_tags };
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
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const analyze = await callAIAnalyze(data.content, data.scene ?? null, data.screenshot_url ?? null, data.reference_url ?? null);
    const { data: inserted, error } = await supabaseAdmin
      .from("observations")
      .insert({
        object_id: data.object_id,
        user_id: userId,
        content: data.content,
        scene: data.scene ?? null,
        screenshot_url: data.screenshot_url ?? null,
        reference_url: data.reference_url ?? null,
        cleaned_content: analyze.cleaned_content,
        evidence_level: analyze.evidence_level,
        tags: analyze.tags,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id, evidence_level: analyze.evidence_level, tags: analyze.tags, reason: analyze.reason };
  });

// ===== 重新生成对象温度（admin） =====
export const recomputeTemperature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ object_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles?.length) throw new Error("仅管理员可执行");

    const { data: obj } = await supabaseAdmin.from("objects").select("id, name").eq("id", data.object_id).single();
    if (!obj) throw new Error("对象不存在");

    const { data: obs } = await supabaseAdmin
      .from("observations")
      .select("cleaned_content, content, evidence_level, tags")
      .eq("object_id", data.object_id)
      .eq("status", "approved");

    const list = (obs ?? []).map((o) => ({
      content: o.cleaned_content || o.content,
      evidence_level: o.evidence_level ?? "C",
      tags: (o.tags as string[]) ?? [],
    }));

    if (list.length === 0) {
      await supabaseAdmin.from("objects").update({
        temperature: 24,
        ai_summary: "暂无足够观察生成总结。",
        top_tags: [],
        observation_count: 0,
      }).eq("id", data.object_id);
      return { temperature: 24 };
    }

    const result = await callAISummary(obj.name, list);
    await supabaseAdmin.from("objects").update({
      temperature: result.temperature,
      ai_summary: result.summary,
      top_tags: result.top_tags,
      observation_count: list.length,
    }).eq("id", data.object_id);

    await supabaseAdmin.from("analysis_logs").insert({
      object_id: data.object_id,
      snapshot: { temperature: result.temperature, top_tags: result.top_tags, obs_count: list.length },
    });

    return { temperature: result.temperature, summary: result.summary };
  });

// ===== 管理员审核观察 =====
export const reviewObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      note: z.string().max(500).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles?.length) throw new Error("仅管理员可执行");
    const status = data.action === "approve" ? "approved" : "rejected";
    const { data: updated, error } = await supabaseAdmin
      .from("observations")
      .update({ status, admin_note: data.note ?? null })
      .eq("id", data.id)
      .select("object_id")
      .single();
    if (error) throw new Error(error.message);
    return { object_id: updated.object_id };
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
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles?.length) throw new Error("仅管理员可执行");
    const { data: obj, error } = await supabaseAdmin
      .from("objects")
      .insert({ name: data.name, type: data.type, description: data.description ?? null })
      .select("id")
      .single();
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
    const { userId } = context;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles?.length) throw new Error("仅管理员可执行");
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
    }).parse(input)
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

// ===== 提升管理员（仅未存在管理员时允许首次设立 / 否则需 admin 操作）=====
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("已存在管理员，无法自助声明");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
