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
  .handler(async ({ data }): Promise<{ slug: string; bodyJson: string; updated_at: string } | null> => {
    const { data: row, error } = await supabaseAdmin
      .from("page_content" as never)
      .select("slug, body, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const r = row as { slug: string; body: unknown; updated_at: string };
    return { slug: r.slug, bodyJson: JSON.stringify(r.body ?? {}), updated_at: r.updated_at };
  });

export const adminUpsertPageContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slug: z.string().min(1).max(64), bodyJson: z.string().min(2).max(200_000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let body: unknown;
    try {
      body = JSON.parse(data.bodyJson);
    } catch {
      throw new Error("内容不是合法 JSON");
    }
    const { error } = await supabaseAdmin
      .from("page_content" as never)
      .upsert(
        {
          slug: data.slug,
          body,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        } as never,
        { onConflict: "slug" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
