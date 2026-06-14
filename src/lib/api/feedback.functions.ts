import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const feedbackStatusSchema = z.enum(["new", "reviewed", "archived"]);
const feedbackContactTypeSchema = z.enum(["wechat", "email", "other", ""]);

const FEEDBACK_ADMIN_COLUMNS = "id, message, contact_type, contact, status, created_at, updated_at";

type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
type FeedbackRow = {
  id: string;
  message: string;
  contact_type: "wechat" | "email" | "other" | null;
  contact: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
};

function normalizeSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMessage(value: string) {
  return value.trim().replace(/\n{3,}/g, "\n\n");
}

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!roles?.length) throw new Error("仅管理员可执行");
}

export const submitPlatformFeedback = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        message: z.string().min(1).max(2200),
        contact: z.string().max(180).optional().default(""),
        contact_type: feedbackContactTypeSchema.optional().default(""),
        website: z.string().max(180).optional().default(""),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    if (data.website.trim()) return { ok: true };

    const message = normalizeMessage(data.message);
    if (message.length < 5) throw new Error("建议内容至少 5 个字");
    if (message.length > 2000) throw new Error("建议内容最多 2000 字");

    const contact = normalizeSingleLine(data.contact);
    if (contact.length > 160) throw new Error("联系方式最多 160 个字符");

    const { error } = await supabaseAdmin.from("platform_feedback" as never).insert({
      message,
      contact: contact || null,
      contact_type: data.contact_type || null,
      status: "new",
    } as never);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const adminListPlatformFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["all", "new", "reviewed", "archived"]).optional().default("new"),
        limit: z.number().int().min(1).max(200).optional().default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let query = supabaseAdmin
      .from("platform_feedback" as never)
      .select(FEEDBACK_ADMIN_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as FeedbackRow[];
  });

export const adminUpdatePlatformFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: feedbackStatusSchema,
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("platform_feedback" as never)
      .update({ status: data.status } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
