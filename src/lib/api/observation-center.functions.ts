// 观察中心 V1 —— 关注 / 通知 / 信息流 / 话题
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BANDS } from "@/lib/temperature";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ===== 信息流 =====

export const getObservationFeed = createServerFn({ method: "GET" })
  .inputValidator((i) =>
    z
      .object({
        kind: z.enum(["all", "heating", "cooling"]).default("all").optional(),
        limit: z.number().int().min(1).max(100).default(40).optional(),
      })
      .partial()
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const kind = data.kind ?? "all";
    const limit = data.limit ?? 40;
    let q = supabaseAdmin
      .from("temperature_events" as never)
      .select("id, object_id, delta, temperature_after, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (kind === "heating") q = q.gt("delta", 0);
    if (kind === "cooling") q = q.lt("delta", 0);

    const { data: rows } = await q;
    const events = (rows ?? []) as Array<{
      id: string;
      object_id: string;
      delta: number;
      temperature_after: number;
      reason: string;
      created_at: string;
    }>;

    const ids = [...new Set(events.map((e) => e.object_id))];
    if (ids.length === 0) return [];
    const { data: objs } = await supabaseAdmin
      .from("objects")
      .select("id, name, type, temperature")
      .eq("hidden", false)
      .eq("status", "published")
      .in("id", ids);
    const oMap = new Map((objs ?? []).map((o) => [o.id, o]));
    return events.map((e) => ({
      ...e,
      before: Math.round((Number(e.temperature_after) - Number(e.delta)) * 10) / 10,
      object: oMap.get(e.object_id) ?? null,
    }));
  });

// ===== 首页摘要 =====

export const getHomeSummary = createServerFn({ method: "GET" }).handler(async () => {
  const since24h = new Date(Date.now() - 86400_000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [todayEvents, recentEvents, latestCases, latestObs, newestObjs, allObjTemps, recentTags] =
    await Promise.all([
      supabaseAdmin
        .from("temperature_events" as never)
        .select("object_id, delta, temperature_after, reason, created_at")
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("temperature_events" as never)
        .select("object_id, delta")
        .gte("created_at", since7d),
      supabaseAdmin
        .from("knowledge_cases" as never)
        .select("code, title, summary, polarity, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("observations")
        .select("id, object_id, summary, evidence_level, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("objects")
        .select("id, name, type, temperature, observation_count, created_at")
        .eq("status", "published")
        .eq("hidden", false)
        .gt("temperature", 40)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("objects")
        .select("temperature")
        .eq("status", "published")
        .eq("hidden", false),
      supabaseAdmin
        .from("observations")
        .select("tags, created_at")
        .eq("status", "approved")
        .gte("created_at", since30d),
    ]);

  const events7d = (recentEvents.data ?? []) as Array<{ object_id: string; delta: number }>;
  const byObj = new Map<string, number>();
  for (const e of events7d) byObj.set(e.object_id, (byObj.get(e.object_id) ?? 0) + Number(e.delta));
  const sorted = [...byObj.entries()].sort((a, b) => b[1] - a[1]);
  const heatIds = sorted.slice(0, 5).map(([id]) => id);
  const coolIds = [...sorted]
    .reverse()
    .slice(0, 5)
    .filter(([, v]) => v < 0)
    .map(([id]) => id);
  const obsIds = [...new Set((latestObs.data ?? []).map((o) => o.object_id))];
  const todayObjIds = [
    ...new Set(((todayEvents.data ?? []) as Array<{ object_id: string }>).map((e) => e.object_id)),
  ];

  const allIds = [...new Set([...heatIds, ...coolIds, ...obsIds, ...todayObjIds])];
  const { data: objs } = allIds.length
    ? await supabaseAdmin
        .from("objects")
        .select("id, name, type, temperature")
        .in("id", allIds)
        .eq("hidden", false)
        .eq("status", "published")
    : { data: [] as Array<{ id: string; name: string; type: string; temperature: number }> };
  const oMap = new Map((objs ?? []).map((o) => [o.id, o]));

  const pack = (ids: string[]) =>
    ids
      .map((id) => {
        const o = oMap.get(id);
        return o ? { ...o, delta_7d: Math.round((byObj.get(id) ?? 0) * 10) / 10 } : null;
      })
      .filter(Boolean);

  const todayWithObj = (
    (todayEvents.data ?? []) as Array<{
      object_id: string;
      delta: number;
      temperature_after: number;
      reason: string;
      created_at: string;
    }>
  )
    .slice(0, 8)
    .map((e) => ({
      ...e,
      before: Math.round((Number(e.temperature_after) - Number(e.delta)) * 10) / 10,
      object: oMap.get(e.object_id) ?? null,
    }));

  const temps = (allObjTemps.data ?? []) as Array<{ temperature: number }>;
  const bandCounts = BANDS.map((b) => ({
    band: b.band,
    range: `${b.range[0]}–${b.range[1]}°`,
    label: b.label,
    color: b.color,
    count: temps.filter((t) => {
      const v = Number(t.temperature);
      return v >= b.range[0] && v <= b.range[1];
    }).length,
  }));
  const tagCount = new Map<string, number>();
  for (const o of (recentTags.data ?? []) as Array<{ tags: unknown }>) {
    const tags = Array.isArray(o.tags) ? (o.tags as string[]) : [];
    for (const t of tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const trendingTags = [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);

  return {
    today_events: todayWithObj,
    today_events_count: (todayEvents.data ?? []).length,
    heating: pack(heatIds),
    cooling: pack(coolIds),
    latest_cases: latestCases.data ?? [],
    latest_observations: (latestObs.data ?? []).map((o) => ({
      ...o,
      object: oMap.get(o.object_id) ?? null,
    })),
    newest_objects: newestObjs.data ?? [],
    band_counts: bandCounts,
    total_objects: temps.length,
    trending_tags: trendingTags,
  };
});

// ===== 趋势话题（按标签） =====

export const getTrendingTopics = createServerFn({ method: "GET" })
  .inputValidator((i) =>
    z
      .object({ days: z.number().int().min(1).max(90).default(30).optional() })
      .partial()
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data: obs } = await supabaseAdmin
      .from("observations")
      .select("tags, created_at")
      .eq("status", "approved")
      .gte("created_at", since);
    const tagCount = new Map<string, number>();
    for (const o of (obs ?? []) as Array<{ tags: unknown }>) {
      const tags = Array.isArray(o.tags) ? (o.tags as string[]) : [];
      for (const t of tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    }
    return [...tagCount.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 24);
  });

// ===== 单个话题详情 =====

export const getTopicDetail = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ tag: z.string().min(1).max(60) }).parse(i))
  .handler(async ({ data }) => {
    const [obs, cases] = await Promise.all([
      supabaseAdmin
        .from("observations")
        .select("id, object_id, summary, evidence_level, created_at")
        .eq("status", "approved")
        .contains("tags", [data.tag])
        .order("created_at", { ascending: false })
        .limit(40),
      supabaseAdmin
        .from("knowledge_cases" as never)
        .select("code, title, summary, polarity, created_at")
        .eq("status", "published")
        .contains("tags", [data.tag])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const obsRows = (obs.data ?? []) as Array<{
      id: string;
      object_id: string;
      summary: string | null;
      evidence_level: string | null;
      created_at: string;
    }>;
    const ids = [...new Set(obsRows.map((o) => o.object_id))];
    const { data: objs } = ids.length
      ? await supabaseAdmin
          .from("objects")
          .select(
            "id, name, type, temperature, observation_count, ai_summary, top_tags, heat_sources, cooling_sources, updated_at",
          )
          .in("id", ids)
          .eq("hidden", false)
          .eq("status", "published")
      : {
          data: [] as Array<{
            id: string;
            name: string;
            type: string;
            temperature: number;
            observation_count: number;
            ai_summary: string | null;
            top_tags: { tag: string; count: number }[] | null;
            heat_sources: { label?: string; title?: string }[] | null;
            cooling_sources: { label?: string; title?: string }[] | null;
            updated_at: string | null;
          }>,
        };
    const oMap = new Map((objs ?? []).map((o) => [o.id, o]));

    // 月度趋势
    const monthly = new Map<string, number>();
    for (const o of obsRows) {
      const k = o.created_at.slice(0, 7);
      monthly.set(k, (monthly.get(k) ?? 0) + 1);
    }
    const trend = [...monthly.entries()].sort().map(([month, count]) => ({ month, count }));

    return {
      tag: data.tag,
      total: obsRows.length,
      trend,
      related_objects: (objs ?? []).slice(0, 12),
      observations: obsRows.map((o) => ({ ...o, object: oMap.get(o.object_id) ?? null })),
      cases: cases.data ?? [],
    };
  });

// ===== 关注 / Watchlist =====

export const followObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ object_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("watchlist" as never)
      .upsert({ user_id: context.userId, object_id: data.object_id } as never, {
        onConflict: "user_id,object_id",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unfollowObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ object_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await supabaseAdmin
      .from("watchlist" as never)
      .delete()
      .eq("user_id", context.userId)
      .eq("object_id", data.object_id);
    return { ok: true };
  });

export const isFollowing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ object_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("watchlist" as never)
      .select("id")
      .eq("user_id", context.userId)
      .eq("object_id", data.object_id)
      .maybeSingle();
    return { following: !!row };
  });

export const getMyWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await supabaseAdmin
      .from("watchlist" as never)
      .select("object_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    const ids = (rows ?? []).map((r: { object_id: string }) => r.object_id);
    if (ids.length === 0) return [];
    const { data: objs } = await supabaseAdmin
      .from("objects")
      .select("id, name, type, temperature, observation_count, ai_summary")
      .in("id", ids);
    return objs ?? [];
  });

export const getMyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [watch, myObs, notif] = await Promise.all([
      supabaseAdmin
        .from("watchlist" as never)
        .select("object_id")
        .eq("user_id", context.userId),
      supabaseAdmin
        .from("observations")
        .select("id, object_id, status, summary, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("notifications" as never)
        .select("id, kind, title, body, object_id, read_at, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    const wIds = (watch.data ?? []).map((r: { object_id: string }) => r.object_id);
    const oIds = [
      ...new Set([
        ...wIds,
        ...(myObs.data ?? []).map((o) => o.object_id),
        ...((notif.data ?? [])
          .map((n: { object_id: string | null }) => n.object_id)
          .filter(Boolean) as string[]),
      ]),
    ];
    const { data: objs } = oIds.length
      ? await supabaseAdmin.from("objects").select("id, name, type, temperature").in("id", oIds)
      : { data: [] as Array<{ id: string; name: string; type: string; temperature: number }> };
    const oMap = new Map((objs ?? []).map((o) => [o.id, o]));
    return {
      watching: wIds.map((id) => oMap.get(id)).filter(Boolean),
      my_observations: (myObs.data ?? []).map((o) => ({
        ...o,
        object: oMap.get(o.object_id) ?? null,
      })),
      notifications: (notif.data ?? []).map((n: { object_id: string | null }) => ({
        ...n,
        object: n.object_id ? (oMap.get(n.object_id) ?? null) : null,
      })),
      unread_count: (notif.data ?? []).filter((n: { read_at: string | null }) => !n.read_at).length,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = supabaseAdmin
      .from("notifications" as never)
      .update({ read_at: new Date().toISOString() } as never)
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (data.ids?.length) q = q.in("id", data.ids);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
