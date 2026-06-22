import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const COMMENT_ADMIN_COLUMNS =
  "id, object_id, user_id, parent_id, body, status, moderation_note, helpful_count, report_count, created_at, updated_at";
const COMMENT_PUBLIC_COLUMNS = "id, user_id, body, helpful_count, created_at";
const COMMENT_RATE_LIMIT_PER_HOUR = 8;
const REPORT_RATE_LIMIT_PER_HOUR = 20;

const commentStatusSchema = z.enum(["pending", "approved", "rejected", "hidden"]);
const reportReasonSchema = z.enum([
  "spam",
  "personal_attack",
  "privacy",
  "false_info",
  "off_topic",
  "other",
]);

type ObjectCommentRow = {
  id: string;
  object_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  moderation_note: string | null;
  helpful_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
  objects?: {
    id: string;
    name: string;
    type?: string;
    temperature?: number;
    status?: string;
    hidden?: boolean;
  } | null;
};

type ObjectCommentReportRow = {
  id: string;
  comment_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type PublicObjectCommentRow = {
  id: string;
  user_id: string;
  body: string;
  helpful_count: number;
  created_at: string;
  objects?: ObjectCommentRow["objects"];
};

function normalizeBody(body: string) {
  return body.replace(/\s+/g, " ").trim();
}

function authorLabel(displayName: string | null | undefined) {
  const cleaned = displayName?.trim();
  return cleaned || "平台用户";
}

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!roles?.length) throw new Error("仅管理员可执行");
}

async function writeAuditLog(
  actor: string,
  action: string,
  targetId: string | null,
  before: unknown,
  after: unknown,
  reason?: string | null,
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actor,
    action,
    target_type: "object_comment",
    target_id: targetId,
    before: before as never,
    after: after as never,
    reason: reason ?? null,
  });
}

async function ensurePublicObject(objectId: string) {
  const { data: object, error } = await supabaseAdmin
    .from("objects")
    .select("id")
    .eq("id", objectId)
    .eq("status", "published")
    .eq("hidden", false)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!object) throw new Error("对象不存在或暂不可留言");
}

async function attachAuthorLabels<T extends { user_id: string }>(rows: T[]) {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const profileMap = new Map<string, { display_name: string | null }>();
  if (userIds.length) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, { display_name: profile.display_name });
    }
  }

  return rows.map((row) => ({
    ...row,
    author_label: authorLabel(profileMap.get(row.user_id)?.display_name),
  }));
}

function toPublicComment(row: PublicObjectCommentRow & { author_label: string }) {
  return {
    id: row.id,
    body: row.body,
    author_label: row.author_label,
    helpful_count: Number(row.helpful_count ?? 0),
    created_at: row.created_at,
    ...(row.objects !== undefined
      ? {
          objects: row.objects
            ? {
                id: row.objects.id,
                name: row.objects.name,
                type: row.objects.type,
                temperature: row.objects.temperature,
              }
            : null,
        }
      : {}),
  };
}

function toAdminComment(
  row: ObjectCommentRow & { author_label: string },
  reports: ObjectCommentReportRow[],
) {
  return {
    id: row.id,
    object_id: row.object_id,
    body: row.body,
    status: row.status,
    author_label: row.author_label,
    helpful_count: Number(row.helpful_count ?? 0),
    report_count: Number(row.report_count ?? 0),
    created_at: row.created_at,
    objects: row.objects
      ? {
          id: row.objects.id,
          name: row.objects.name,
          type: row.objects.type,
        }
      : null,
    reports: reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      created_at: report.created_at,
    })),
  };
}

async function assertUserWithinHourlyLimit(tableName: string, userId: string, limit: number) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from(tableName as never)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= limit) throw new Error("操作过于频繁，请稍后再试");
}

export const listObjectComments = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        object_id: z.string().uuid(),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(30),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    await ensurePublicObject(data.object_id);
    const {
      data: rows,
      error,
      count,
    } = await supabaseAdmin
      .from("object_comments" as never)
      .select(COMMENT_PUBLIC_COLUMNS, { count: "exact" })
      .eq("object_id", data.object_id)
      .eq("status", "approved")
      .order("helpful_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    const comments = await attachAuthorLabels((rows ?? []) as PublicObjectCommentRow[]);
    return {
      comments: comments.map(toPublicComment),
      total: count ?? 0,
    };
  });

export const listRecentObjectComments = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ limit: z.number().int().min(1).max(60).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("object_comments" as never)
      .select(`${COMMENT_PUBLIC_COLUMNS}, objects!inner(id, name, type, temperature, status, hidden)`)
      .eq("status", "approved")
      .eq("objects.status", "published")
      .eq("objects.hidden", false)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const comments = await attachAuthorLabels((rows ?? []) as PublicObjectCommentRow[]);
    return comments.map(toPublicComment);
  });

export const listMyCommentReactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ comment_ids: z.array(z.string().uuid()).max(100) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    if (data.comment_ids.length === 0) return { helpful_comment_ids: [] as string[] };
    const { data: rows, error } = await supabaseAdmin
      .from("object_comment_reactions" as never)
      .select("comment_id")
      .eq("user_id", context.userId)
      .eq("reaction", "helpful")
      .in("comment_id", data.comment_ids);
    if (error) throw new Error(error.message);
    return {
      helpful_comment_ids: ((rows ?? []) as Array<{ comment_id: string }>).map(
        (row) => row.comment_id,
      ),
    };
  });

export const createObjectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        object_id: z.string().uuid(),
        parent_id: z.string().uuid().optional().nullable(),
        body: z.string().trim().min(2).max(800),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensurePublicObject(data.object_id);
    await assertUserWithinHourlyLimit(
      "object_comments",
      context.userId,
      COMMENT_RATE_LIMIT_PER_HOUR,
    );

    if (data.parent_id) {
      const { data: parent, error } = await supabaseAdmin
        .from("object_comments" as never)
        .select("id, object_id, status")
        .eq("id", data.parent_id)
        .eq("object_id", data.object_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!parent) throw new Error("回复的留言不存在");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("object_comments" as never)
      .insert({
        object_id: data.object_id,
        user_id: context.userId,
        parent_id: data.parent_id ?? null,
        body: normalizeBody(data.body),
        status: "pending",
      } as never)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as { id: string }).id, status: "pending" as const };
  });

export const toggleCommentHelpful = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ comment_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: comment, error: commentError } = await supabaseAdmin
      .from("object_comments" as never)
      .select("id, status")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (commentError) throw new Error(commentError.message);
    if (!comment || (comment as { status: string }).status !== "approved") {
      throw new Error("留言不存在或尚未公开");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("object_comment_reactions" as never)
      .select("id")
      .eq("comment_id", data.comment_id)
      .eq("user_id", context.userId)
      .eq("reaction", "helpful")
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    let helpful = true;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("object_comment_reactions" as never)
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
      helpful = false;
    } else {
      const { error } = await supabaseAdmin.from("object_comment_reactions" as never).insert({
        comment_id: data.comment_id,
        user_id: context.userId,
        reaction: "helpful",
      } as never);
      if (error) throw new Error(error.message);
    }

    const { data: updated } = await supabaseAdmin
      .from("object_comments" as never)
      .select("helpful_count")
      .eq("id", data.comment_id)
      .maybeSingle();
    return {
      helpful,
      helpful_count: Number((updated as { helpful_count?: number } | null)?.helpful_count ?? 0),
    };
  });

export const reportObjectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        comment_id: z.string().uuid(),
        reason: reportReasonSchema,
        details: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertUserWithinHourlyLimit(
      "object_comment_reports",
      context.userId,
      REPORT_RATE_LIMIT_PER_HOUR,
    );

    const { data: comment, error: commentError } = await supabaseAdmin
      .from("object_comments" as never)
      .select("id, status")
      .eq("id", data.comment_id)
      .maybeSingle();
    if (commentError) throw new Error(commentError.message);
    if (!comment || (comment as { status: string }).status !== "approved") {
      throw new Error("留言不存在或尚未公开");
    }

    const { error } = await supabaseAdmin.from("object_comment_reports" as never).upsert(
      {
        comment_id: data.comment_id,
        user_id: context.userId,
        reason: data.reason,
        details: data.details ? normalizeBody(data.details) : null,
        status: "open",
      } as never,
      { onConflict: "comment_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListObjectComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["all", "pending", "approved", "rejected", "hidden"]).default("pending"),
        reported: z.boolean().default(false),
        q: z.string().max(120).optional().default(""),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let query = supabaseAdmin
      .from("object_comments" as never)
      .select(`${COMMENT_ADMIN_COLUMNS}, objects(id, name, type)`)
      .order("report_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status !== "all") query = query.eq("status", data.status);
    if (data.reported) query = query.gt("report_count", 0);
    if (data.q.trim()) query = query.ilike("body", `%${data.q.trim()}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const comments = (rows ?? []) as ObjectCommentRow[];
    const commentIds = comments.map((row) => row.id);
    const { data: reports, error: reportError } = commentIds.length
      ? await supabaseAdmin
          .from("object_comment_reports" as never)
          .select("id, comment_id, reason, details, status, created_at")
          .in("comment_id", commentIds)
          .order("created_at", { ascending: false })
      : { data: [] as ObjectCommentReportRow[], error: null };
    if (reportError) throw new Error(reportError.message);

    const reportsByComment = new Map<string, ObjectCommentReportRow[]>();
    for (const report of (reports ?? []) as ObjectCommentReportRow[]) {
      reportsByComment.set(report.comment_id, [
        ...(reportsByComment.get(report.comment_id) ?? []),
        report,
      ]);
    }

    const withAuthors = await attachAuthorLabels(comments);
    return withAuthors.map((comment) =>
      toAdminComment(comment, reportsByComment.get(comment.id) ?? []),
    );
  });

export const adminModerateObjectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: commentStatusSchema,
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: before, error: beforeError } = await supabaseAdmin
      .from("object_comments" as never)
      .select(COMMENT_ADMIN_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (beforeError) throw new Error(beforeError.message);
    if (!before) throw new Error("留言不存在");

    const patch = { status: data.status, moderation_note: data.note ?? null };
    const { error } = await supabaseAdmin
      .from("object_comments" as never)
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await writeAuditLog(
      context.userId,
      `comment_${data.status}`,
      data.id,
      before,
      patch,
      data.note ?? null,
    );
    return { ok: true };
  });

export const adminDeleteObjectComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: before, error: beforeError } = await supabaseAdmin
      .from("object_comments" as never)
      .select(COMMENT_ADMIN_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (beforeError) throw new Error(beforeError.message);
    if (!before) throw new Error("留言不存在");
    const { error } = await supabaseAdmin
      .from("object_comments" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAuditLog(context.userId, "comment_delete", data.id, before, null);
    return { ok: true };
  });

export const adminResolveCommentReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ comment_id: z.string().uuid(), status: z.enum(["resolved", "dismissed"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("object_comment_reports" as never)
      .update({ status: data.status } as never)
      .eq("comment_id", data.comment_id)
      .eq("status", "open");
    if (error) throw new Error(error.message);
    await writeAuditLog(context.userId, `comment_reports_${data.status}`, data.comment_id, null, {
      status: data.status,
    });
    return { ok: true };
  });
