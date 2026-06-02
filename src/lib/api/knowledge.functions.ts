// 女性友好知识引擎 V1 —— 原则 / 标签 / 案例的服务端函数
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!data?.length) throw new Error("仅管理员可执行");
}

export type Principle = {
  id: string; code: string; name: string; description: string | null;
  weight: number; active: boolean; display_order: number;
};
export type KTag = {
  id: string; code: string; name_zh: string; name_en: string | null;
  description: string | null; weight: number; active: boolean;
  merged_into: string | null;
};
export type KCase = {
  id: string; code: string; title: string; summary: string; detail: string | null;
  polarity: "positive" | "negative" | "controversial";
  status: "draft" | "published" | "archived";
  tags: string[]; principles: string[]; source_url: string | null;
  featured: boolean; created_at: string;
};

// ===== 公共读取 =====
export const listPrinciples = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("principles" as never).select("*").eq("active", true).order("display_order");
    return (data ?? []) as Principle[];
  });


export const listTags = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("knowledge_tags" as never).select("*").order("weight", { ascending: false });
    return (data ?? []) as KTag[];
  });

export const listCases = createServerFn({ method: "GET" })
  .inputValidator((i) =>
    z.object({
      polarity: z.enum(["positive", "negative", "controversial"]).optional(),
      tag: z.string().optional(),
      keyword: z.string().max(80).optional(),
    }).partial().parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("knowledge_cases" as never).select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }).limit(200);
    if (data.polarity) q = q.eq("polarity", data.polarity);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.keyword) q = q.or(`title.ilike.%${data.keyword}%,summary.ilike.%${data.keyword}%`);
    const { data: rows } = await q;
    return (rows ?? []) as KCase[];
  });

export const listAllCasesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      polarity: z.enum(["positive", "negative", "controversial"]).optional(),
      tag: z.string().optional(),
      keyword: z.string().max(80).optional(),
    }).partial().parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("knowledge_cases" as never).select("*")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }).limit(200);
    if (data.polarity) q = q.eq("polarity", data.polarity);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.keyword) q = q.or(`title.ilike.%${data.keyword}%,summary.ilike.%${data.keyword}%`);
    const { data: rows } = await q;
    return (rows ?? []) as KCase[];
  });


export const getCase = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ code: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("knowledge_cases" as never).select("*").eq("code", data.code).maybeSingle();
    return (row ?? null) as KCase | null;
  });

// ===== 管理：原则 =====
export const upsertPrinciple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(1).max(60),
    name: z.string().min(1).max(60),
    description: z.string().max(500).optional(),
    weight: z.number().min(0).max(5).default(1),
    active: z.boolean().default(true),
    display_order: z.number().int().default(0),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("principles" as never)
      .upsert(data as never, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePrinciple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("principles" as never).delete().eq("id", data.id);
    return { ok: true };
  });

// ===== 管理：标签 =====
export const upsertTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(1).max(60),
    name_zh: z.string().min(1).max(60),
    name_en: z.string().max(60).optional(),
    description: z.string().max(500).optional(),
    weight: z.number().min(0).max(20).default(5),
    active: z.boolean().default(true),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("knowledge_tags" as never)
      .upsert(data as never, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mergeTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    source_id: z.string().uuid(), target_id: z.string().uuid(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.source_id === data.target_id) throw new Error("无法合并到自身");
    await supabaseAdmin.from("knowledge_tags" as never)
      .update({ active: false, merged_into: data.target_id } as never)
      .eq("id", data.source_id);
    return { ok: true };
  });

// ===== 管理：案例 =====
export const upsertCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(500),
    detail: z.string().max(5000).optional(),
    polarity: z.enum(["positive", "negative", "controversial"]),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    tags: z.array(z.string()).max(10).default([]),
    principles: z.array(z.string()).max(10).default([]),
    source_url: z.string().url().max(500).optional().or(z.literal("")),
    featured: z.boolean().default(false),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload: Record<string, unknown> = { ...data };
    if (payload.source_url === "") payload.source_url = null;
    if (!data.id) delete payload.id;
    payload.created_by = context.userId;
    const { data: row, error } = data.id
      ? await supabaseAdmin.from("knowledge_cases" as never).update(payload as never).eq("id", data.id).select("id, code").single()
      : await supabaseAdmin.from("knowledge_cases" as never).insert(payload as never).select("id, code").single();
    if (error) throw new Error(error.message);
    return row as { id: string; code: string };
  });

export const deleteCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("knowledge_cases" as never).delete().eq("id", data.id);
    return { ok: true };
  });

// ===== 知识库概览 =====
export const getKnowledgeOverview = createServerFn({ method: "GET" })
  .handler(async () => {
    const [p, t, c] = await Promise.all([
      supabaseAdmin.from("principles" as never).select("id", { count: "exact", head: true }).eq("active", true),
      supabaseAdmin.from("knowledge_tags" as never).select("id", { count: "exact", head: true }).eq("active", true),
      supabaseAdmin.from("knowledge_cases" as never).select("polarity, status", { count: "exact" }).eq("status", "published"),
    ]);
    const cases = (c.data ?? []) as { polarity: string }[];
    const byPolarity = { positive: 0, negative: 0, controversial: 0 } as Record<string, number>;
    for (const r of cases) byPolarity[r.polarity] = (byPolarity[r.polarity] ?? 0) + 1;
    return {
      principles_active: p.count ?? 0,
      tags_active: t.count ?? 0,
      cases_total: c.count ?? 0,
      by_polarity: byPolarity,
    };
  });
