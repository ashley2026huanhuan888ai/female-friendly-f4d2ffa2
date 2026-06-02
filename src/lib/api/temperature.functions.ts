// 温度智能中心 —— 服务端函数
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runEngine, type EngineObservation, type TagMeta, type EngineResult } from "@/lib/temperature-engine";
import { aggregateRuleMinimum } from "@/lib/temperature-rules";

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!roles?.length) throw new Error("仅管理员可执行");
}

async function loadTagMap(): Promise<Map<string, TagMeta>> {
  const { data } = await supabaseAdmin
    .from("knowledge_tags" as never)
    .select("code, name_zh, weight, polarity, active")
    .eq("active", true);
  const m = new Map<string, TagMeta>();
  for (const t of (data ?? []) as Array<TagMeta & { active: boolean }>) {
    m.set(t.name_zh, { code: t.code, name_zh: t.name_zh, weight: Number(t.weight), polarity: t.polarity });
  }
  return m;
}

interface FullEngine extends EngineResult {
  object_id: string;
  before: number;
  delta: number;
}

async function recomputeAndPersist(
  object_id: string,
  reason: string,
  actor_id: string | null,
  observation_id: string | null,
  extraCooling = 0,
): Promise<FullEngine | null> {
  const { data: obj } = await supabaseAdmin
    .from("objects").select("id, temperature, frozen, last_cooled_at").eq("id", object_id).single();
  if (!obj || obj.frozen) return null;

  const { data: rows } = await supabaseAdmin
    .from("observations")
    .select("id, evidence_level, confidence, tags, cases_cited, created_at")
    .eq("object_id", object_id).eq("status", "approved")
    .order("created_at", { ascending: false });

  const observations: EngineObservation[] = ((rows ?? []) as never as Array<{
    id: string; evidence_level: string | null; confidence: number | string;
    tags: unknown; cases_cited: unknown; created_at: string;
  }>).map((o) => ({
    id: o.id,
    evidence_level: o.evidence_level,
    confidence: Number(o.confidence) || 0.7,
    tags: Array.isArray(o.tags) ? (o.tags as string[]) : [],
    cases_cited: Array.isArray(o.cases_cited) ? (o.cases_cited as string[]) : [],
    created_at: o.created_at,
  }));

  const tagMap = await loadTagMap();
  const result = runEngine(observations, tagMap, { cooling: extraCooling });
  const before = Number(obj.temperature) || 24;
  const delta = Math.round((result.temperature - before) * 10) / 10;

  await supabaseAdmin.from("objects").update({
    temperature: result.temperature,
    heat_sources: result.heat_sources as never,
    cooling_sources: result.cooling_sources as never,
    observation_count: result.breakdown.active_count,
    ...(extraCooling !== 0 ? { last_cooled_at: new Date().toISOString() } : {}),
  } as never).eq("id", object_id);

  // 仅在温度有变化时写入事件，避免噪声
  if (delta !== 0 || extraCooling !== 0) {
    await supabaseAdmin.from("temperature_events" as never).insert({
      object_id, observation_id,
      delta, temperature_after: result.temperature,
      reason,
      breakdown: result.breakdown as never,
      actor_id,
    } as never);
  }

  return { ...result, object_id, before, delta };
}

// 暴露给 platform.functions.ts 使用（内部调用，不做权限检查）
export async function recomputeObjectWithEngine(
  object_id: string,
  reason: string,
  observation_id: string | null = null,
  actor_id: string | null = null,
) {
  return recomputeAndPersist(object_id, reason, actor_id, observation_id, 0);
}

// ====== Server functions ======

export const recomputeObjectTemperature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ object_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const r = await recomputeAndPersist(data.object_id, "manual_admin", context.userId, null, 0);
    if (!r) throw new Error("对象不存在或已冻结");
    return { temperature: r.temperature, delta: r.delta, breakdown: r.breakdown };
  });

export const getTemperatureExplanation = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ object_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: obj } = await supabaseAdmin
      .from("objects")
      .select("id, name, temperature, heat_sources, cooling_sources, observation_count, last_cooled_at, frozen")
      .eq("id", data.object_id).single();
    if (!obj) throw new Error("对象不存在");
    const { data: latest } = await supabaseAdmin
      .from("temperature_events" as never)
      .select("breakdown, created_at, reason, delta")
      .eq("object_id", data.object_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      object: obj,
      breakdown: ((latest as { breakdown?: unknown } | null)?.breakdown) ?? null,
      last_event: latest ?? null,
    };
  });

export const getTemperatureTimeline = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ object_id: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: events } = await supabaseAdmin
      .from("temperature_events" as never)
      .select("id, delta, temperature_after, reason, breakdown, note, observation_id, created_at")
      .eq("object_id", data.object_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    return events ?? [];
  });

// 批量自然降温：30 天未更新且无新观察的对象 → -1..-3 度
export const runCoolingCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: objs } = await supabaseAdmin
      .from("objects")
      .select("id, temperature, last_cooled_at, updated_at")
      .eq("frozen", false)
      .eq("hidden", false)
      .gt("temperature", 22);
    let cooled = 0;
    for (const o of (objs ?? []) as Array<{ id: string; temperature: number; last_cooled_at: string | null }>) {
      if (o.last_cooled_at && o.last_cooled_at > cutoff) continue;
      const { count } = await supabaseAdmin
        .from("observations")
        .select("id", { count: "exact", head: true })
        .eq("object_id", o.id).eq("status", "approved")
        .gte("created_at", cutoff);
      if ((count ?? 0) > 0) continue;
      const dropAmount = Number(o.temperature) > 60 ? -3 : Number(o.temperature) > 40 ? -2 : -1;
      await recomputeAndPersist(o.id, "cooling_cycle", context.userId, null, dropAmount);
      cooled++;
    }
    return { cooled };
  });

export const getTemperatureDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [topHot, controversial, recentEvents] = await Promise.all([
      supabaseAdmin.from("objects")
        .select("id, name, type, temperature, observation_count")
        .eq("hidden", false).order("temperature", { ascending: false }).limit(10),
      supabaseAdmin.from("objects")
        .select("id, name, type, temperature, observation_count")
        .eq("hidden", false).gte("temperature", 60)
        .order("observation_count", { ascending: false }).limit(10),
      supabaseAdmin.from("temperature_events" as never)
        .select("object_id, delta, temperature_after, reason, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    // 计算 30 天内升温 / 降温最快
    const byObj = new Map<string, number>();
    for (const e of (recentEvents.data ?? []) as Array<{ object_id: string; delta: number }>) {
      byObj.set(e.object_id, (byObj.get(e.object_id) ?? 0) + Number(e.delta));
    }
    const sorted = [...byObj.entries()].sort((a, b) => b[1] - a[1]);
    const heatIds = sorted.slice(0, 5).map(([id]) => id);
    const coolIds = [...sorted].reverse().slice(0, 5).filter(([_, v]) => v < 0).map(([id]) => id);

    const fetchByIds = async (ids: string[]) => {
      if (ids.length === 0) return [];
      const { data } = await supabaseAdmin.from("objects")
        .select("id, name, type, temperature").in("id", ids);
      return ids.map((id) => {
        const o = data?.find((x) => x.id === id);
        return o ? { ...o, delta_30d: byObj.get(id) ?? 0 } : null;
      }).filter(Boolean);
    };
    const [topHeat, topCool] = await Promise.all([fetchByIds(heatIds), fetchByIds(coolIds)]);

    return {
      top_hot: topHot.data ?? [],
      controversial: controversial.data ?? [],
      top_heat_30d: topHeat,
      top_cool_30d: topCool,
    };
  });
