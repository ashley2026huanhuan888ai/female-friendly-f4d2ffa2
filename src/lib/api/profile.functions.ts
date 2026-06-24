import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, bio, avatar_url, reputation, auto_approve, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        display_name: z.string().trim().max(40).nullable().optional(),
        bio: z.string().trim().max(300).nullable().optional(),
        avatar_url: z
          .string()
          .trim()
          .max(500)
          .regex(/^(https?:\/\/|\/)/, "Invalid avatar url")
          .nullable()
          .optional()
          .or(z.literal("").transform(() => null)),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name || null;
    if (data.bio !== undefined) patch.bio = data.bio || null;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url || null;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, bio, avatar_url")
      .eq("id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("用户不存在");
    return {
      id: row.id,
      display_name: row.display_name ?? null,
      bio: row.bio ?? null,
      avatar_url: row.avatar_url ?? null,
    };
  });
