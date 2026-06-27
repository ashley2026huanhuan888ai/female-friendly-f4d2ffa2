import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UserIdInput = z.object({ user_id: z.string().uuid() });

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("不能关注自己");
    const { error } = await supabaseAdmin
      .from("user_follows")
      .upsert(
        { follower_id: context.userId, followee_id: data.user_id } as never,
        { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("user_follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("followee_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFollowStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UserIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const other = data.user_id;
    const [aRes, bRes, fCount, gCount] = await Promise.all([
      supabaseAdmin
        .from("user_follows")
        .select("follower_id", { head: true, count: "exact" })
        .eq("follower_id", me)
        .eq("followee_id", other),
      supabaseAdmin
        .from("user_follows")
        .select("follower_id", { head: true, count: "exact" })
        .eq("follower_id", other)
        .eq("followee_id", me),
      supabaseAdmin
        .from("user_follows")
        .select("follower_id", { head: true, count: "exact" })
        .eq("followee_id", other),
      supabaseAdmin
        .from("user_follows")
        .select("follower_id", { head: true, count: "exact" })
        .eq("follower_id", other),
    ]);
    return {
      following: (aRes.count ?? 0) > 0,
      followed_by: (bRes.count ?? 0) > 0,
      followers_count: fCount.count ?? 0,
      following_count: gCount.count ?? 0,
    };
  });

async function hydrateProfiles(ids: string[]) {
  if (ids.length === 0) return [] as Array<{ id: string; display_name: string | null; avatar_url: string | null }>;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = new Map((data ?? []).map((r) => [r.id, r]));
  return ids.map((id) => {
    const p = map.get(id);
    return {
      id,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });
}

export const listMyFollowing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_follows")
      .select("followee_id, created_at")
      .eq("follower_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return hydrateProfiles((data ?? []).map((r) => r.followee_id));
  });

export const listMyFollowers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_follows")
      .select("follower_id, created_at")
      .eq("followee_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return hydrateProfiles((data ?? []).map((r) => r.follower_id));
  });
