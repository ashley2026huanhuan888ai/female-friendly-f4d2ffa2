import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const input = z.object({ object_id: z.string().uuid() });

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getBoycottStatus = createServerFn({ method: "GET" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("object_boycotts" as never)
      .select("user_id", { count: "exact", head: true })
      .eq("object_id", data.object_id);
    return { count: count ?? 0 };
  });

export const toggleBoycott = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("object_boycotts" as never)
      .select("user_id")
      .eq("object_id", data.object_id)
      .eq("user_id", userId)
      .maybeSingle();

    let mine: boolean;
    if (existing) {
      const { error } = await supabase
        .from("object_boycotts" as never)
        .delete()
        .eq("object_id", data.object_id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      mine = false;
    } else {
      const { error } = await supabase
        .from("object_boycotts" as never)
        .insert({ object_id: data.object_id, user_id: userId } as never);
      if (error) throw new Error(error.message);
      mine = true;
    }

    const { count } = await supabase
      .from("object_boycotts" as never)
      .select("user_id", { count: "exact", head: true })
      .eq("object_id", data.object_id);

    return { count: count ?? 0, mine };
  });

export const isBoycotting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("object_boycotts" as never)
      .select("user_id")
      .eq("object_id", data.object_id)
      .eq("user_id", userId)
      .maybeSingle();
    return { mine: !!row };
  });

export const getObjectBoycottLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ limit: z.number().int().min(1).max(100).default(50) }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("object_boycotts" as never)
      .select("object_id")
      .limit(10000);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of (rows ?? []) as { object_id: string }[]) {
      counts.set(r.object_id, (counts.get(r.object_id) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, data.limit);
    if (top.length === 0) return [] as Array<{ id: string; name: string; type: string; count: number }>;
    const ids = top.map(([id]) => id);
    const { data: objs, error: oerr } = await sb
      .from("objects")
      .select("id,name,type")
      .in("id", ids);
    if (oerr) throw new Error(oerr.message);
    const m = new Map((objs ?? []).map((o: any) => [o.id, o]));
    return top
      .map(([id, count]) => {
        const o = m.get(id) as any;
        return o ? { id, name: o.name, type: o.type, count } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string; type: string; count: number }>;
  });

export const getUserBoycottLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ limit: z.number().int().min(1).max(100).default(50) }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("object_boycotts" as never)
      .select("user_id")
      .limit(10000);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of (rows ?? []) as { user_id: string }[]) {
      counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, data.limit);
    if (top.length === 0) return [] as Array<{ id: string; display_name: string | null; avatar_url: string | null; count: number }>;
    const ids = top.map(([id]) => id);
    const { data: profs, error: perr } = await sb
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", ids);
    if (perr) throw new Error(perr.message);
    const m = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return top.map(([id, count]) => {
      const p = (m.get(id) as any) ?? {};
      return { id, display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null, count };
    });
  });
