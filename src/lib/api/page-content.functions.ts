import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!data?.length) throw new Error("仅管理员可执行");
}

export const getPageContent = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("page_content" as never)
      .select("slug, body, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as { slug: string; body: unknown; updated_at: string } | null as
      | { slug: string; body: Record<string, unknown> | null; updated_at: string }
      | null;
  });

export const adminUpsertPageContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slug: z.string().min(1).max(64), body: z.unknown() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("page_content" as never)
      .upsert(
        {
          slug: data.slug,
          body: data.body,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        } as never,
        { onConflict: "slug" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
