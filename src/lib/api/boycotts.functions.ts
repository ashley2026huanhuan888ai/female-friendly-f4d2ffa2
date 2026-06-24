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
    const sb = publicClient();
    const { count } = await sb
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
