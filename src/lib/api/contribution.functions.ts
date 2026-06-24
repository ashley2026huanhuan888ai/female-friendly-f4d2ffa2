import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ContribKind = "observation_temp" | "invite_signup" | "referral_bonus" | "admin_adjust";

export const getMyContribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profileRes, levelsRes, eventsRes, directInvitesRes, relsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, contribution_points, level, level_title, invite_code, inviter_id")
        .eq("id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("contribution_levels")
        .select("level, min_points, title, badge")
        .order("level", { ascending: true }),
      supabaseAdmin
        .from("contribution_events")
        .select("id, delta, kind, reason, source_user_id, observation_id, depth, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url, contribution_points, created_at")
        .eq("inviter_id", context.userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("invite_relations")
        .select("descendant_id, depth")
        .eq("ancestor_id", context.userId),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    const profile = profileRes.data!;
    const levels = levelsRes.data ?? [];
    const events = eventsRes.data ?? [];
    const directInvites = directInvitesRes.data ?? [];
    const rels = relsRes.data ?? [];

    const tierCounts: Record<number, number> = {};
    for (const r of rels) tierCounts[r.depth] = (tierCounts[r.depth] ?? 0) + 1;

    const totalReferralPoints = events
      .filter((e) => e.kind === "referral_bonus" || e.kind === "invite_signup")
      .reduce((s, e) => s + Number(e.delta), 0);

    const points = Number(profile.contribution_points ?? 0);
    const cur = [...levels].reverse().find((l) => Number(l.min_points) <= points) ?? levels[0];
    const next = levels.find((l) => Number(l.min_points) > points);

    return {
      profile,
      points,
      level: cur,
      next,
      progress: next
        ? Math.min(
            1,
            (points - Number(cur.min_points)) /
              Math.max(1, Number(next.min_points) - Number(cur.min_points)),
          )
        : 1,
      levels,
      events,
      directInvites,
      tierCounts,
      totalReferralPoints,
    };
  });

export const bindInviter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().trim().min(1).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await supabaseAdmin.rpc("bind_inviter", { _code: data.code });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string; inviter_id?: string };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({ range: z.enum(["all", "week", "month"]).default("all"), limit: z.number().int().min(1).max(100).default(50) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.range === "all") {
      const { data: rows, error } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url, contribution_points, level, level_title")
        .gt("contribution_points", 0)
        .order("contribution_points", { ascending: false })
        .limit(data.limit);
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r) => ({ ...r, points: Number(r.contribution_points) }));
    }
    const since = new Date(
      Date.now() - (data.range === "week" ? 7 : 30) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: events, error } = await supabaseAdmin
      .from("contribution_events")
      .select("user_id, delta")
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const sums = new Map<string, number>();
    for (const e of events ?? []) sums.set(e.user_id, (sums.get(e.user_id) ?? 0) + Number(e.delta));
    const top = [...sums.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, data.limit);
    if (top.length === 0) return [];
    const ids = top.map(([id]) => id);
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, level, level_title")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return top.map(([id, pts]) => {
      const p = map.get(id);
      return {
        id,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        level: p?.level ?? 1,
        level_title: p?.level_title ?? "萌新",
        points: pts,
      };
    });
  });

export const getUserBadge = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("level, level_title, contribution_points")
      .eq("id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { data: lv } = await supabaseAdmin
      .from("contribution_levels")
      .select("badge")
      .eq("level", row.level ?? 1)
      .maybeSingle();
    return {
      level: row.level ?? 1,
      title: row.level_title ?? "萌新",
      badge: lv?.badge ?? "",
      points: Number(row.contribution_points ?? 0),
    };
  });

export const adminAdjustPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        user_id: z.string().uuid(),
        delta: z.number().refine((n) => n !== 0, "delta cannot be 0"),
        reason: z.string().trim().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden");
    const { error } = await supabaseAdmin.rpc("add_contribution", {
      _user: data.user_id,
      _delta: data.delta,
      _kind: "admin_adjust",
      _reason: data.reason,
      _source: context.userId,
      _obs: null,
      _temp: null,
      _depth: null,
      _meta: {},
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUserPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ q: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(200).default(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, contribution_points, level, level_title, invite_code, inviter_id")
      .order("contribution_points", { ascending: false })
      .limit(data.limit);
    if (data.q) q = q.or(`email.ilike.%${data.q}%,display_name.ilike.%${data.q}%,invite_code.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
