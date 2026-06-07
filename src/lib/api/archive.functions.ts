// 女性友好体验档案库 V1 — 公开案例检索 / 详情 / 时间线
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ARCHIVE_CATEGORIES = [
  "消费案例",
  "职场案例",
  "影视案例",
  "公共事件案例",
  "广告案例",
  "营销案例",
  "媒体案例",
  "其他案例",
] as const;

const SearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  tags: z.array(z.string()).max(10).optional(),
  categories: z.array(z.string()).max(10).optional(),
  object_types: z.array(z.string()).max(10).optional(),
  evidence: z.array(z.enum(["A", "B", "C", "D"])).optional(),
  temp_min: z.number().min(20).max(100).optional(),
  temp_max: z.number().min(20).max(100).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.number().int().min(1).max(200).default(1),
  page_size: z.number().int().min(1).max(50).default(20),
});

export const searchArchive = createServerFn({ method: "POST" })
  .inputValidator((i) => SearchSchema.parse(i))
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;

    let q = supabaseAdmin
      .from("observations")
      .select(
        `id, case_code, archive_category, summary, cleaned_content, tags, evidence_level,
         impact_score, created_at, scene, reference_url, screenshot_url,
         objects!inner ( id, name, type, temperature, hidden, status )`,
        { count: "exact" },
      )
      .eq("status", "approved");

    if (data.q) {
      const safe = data.q.replace(/[,()*%_\\"']/g, " ").trim();
      if (safe) {
        const term = `%${safe}%`;
        q = q.or(`summary.ilike.${term},cleaned_content.ilike.${term},case_code.ilike.${term}`);
      }
    }
    if (data.categories?.length) q = q.in("archive_category", data.categories);
    if (data.evidence?.length) q = q.in("evidence_level", data.evidence);
    if (data.tags?.length) q = q.overlaps("tags", data.tags);
    if (data.date_from) q = q.gte("created_at", data.date_from);
    if (data.date_to) q = q.lte("created_at", data.date_to);

    q = q.order("created_at", { ascending: false }).range(from, to);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    let items = (rows ?? []) as any[];
    // 过滤隐藏 / 未发布对象 & 对象类型 & 温度区间（在内存里二次过滤）
    items = items.filter((r) => {
      const o = r.objects;
      if (!o || o.hidden || o.status !== "published") return false;
      if (data.object_types?.length && !data.object_types.includes(o.type)) return false;
      if (data.temp_min !== undefined && Number(o.temperature) < data.temp_min) return false;
      if (data.temp_max !== undefined && Number(o.temperature) > data.temp_max) return false;
      return true;
    });

    return {
      items: items.map((r) => ({
        id: r.id,
        case_code: r.case_code,
        archive_category: r.archive_category,
        summary: r.summary ?? r.cleaned_content?.slice(0, 120) ?? "",
        tags: (r.tags as string[]) ?? [],
        evidence_level: r.evidence_level,
        impact_score: Number(r.impact_score) || 0,
        created_at: r.created_at,
        scene: r.scene,
        object: {
          id: r.objects.id,
          name: r.objects.name,
          type: r.objects.type,
          temperature: Number(r.objects.temperature),
        },
      })),
      total: count ?? items.length,
      page: data.page,
      page_size: data.page_size,
    };
  });

export const getCaseDetail = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ code: z.string().trim().min(3).max(40) }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("observations")
      .select(
        `id, case_code, archive_category, summary, cleaned_content, content, facts, tags,
         evidence_level, confidence, impact_score, created_at, scene, reference_url, screenshot_url,
         risk_level, status,
         objects ( id, name, type, temperature, hidden, status, ai_summary )`,
      )
      .eq("case_code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.status !== "approved") throw new Error("案例不存在或尚未发布");
    const obj = (row as any).objects;
    if (!obj || obj.hidden || obj.status !== "published") throw new Error("案例不可访问");

    // 相关案例：同对象 + 同标签 + 同分类
    const tags = (row.tags as string[]) ?? [];
    const [{ data: same_obj }, { data: same_tag }, { data: same_cat }] = await Promise.all([
      supabaseAdmin
        .from("observations")
        .select("id, case_code, summary, tags, evidence_level, created_at")
        .eq("object_id", obj.id)
        .eq("status", "approved")
        .neq("id", row.id)
        .order("created_at", { ascending: false })
        .limit(5),
      tags.length
        ? supabaseAdmin
            .from("observations")
            .select("id, case_code, summary, tags, evidence_level, created_at, objects(name)")
            .overlaps("tags", tags)
            .eq("status", "approved")
            .neq("id", row.id)
            .order("created_at", { ascending: false })
            .limit(6)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("observations")
        .select("id, case_code, summary, evidence_level, created_at, objects(name)")
        .eq("archive_category", row.archive_category ?? "其他案例")
        .eq("status", "approved")
        .neq("id", row.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    return {
      case: {
        id: row.id,
        case_code: row.case_code,
        archive_category: row.archive_category,
        summary: row.summary,
        cleaned_content: row.cleaned_content,
        content: row.content,
        facts: (row.facts as string[]) ?? [],
        tags,
        evidence_level: row.evidence_level,
        confidence: Number(row.confidence) || 0,
        impact_score: Number(row.impact_score) || 0,
        created_at: row.created_at,
        scene: row.scene,
        reference_url: row.reference_url,
        screenshot_url: row.screenshot_url,
      },
      object: {
        id: obj.id,
        name: obj.name,
        type: obj.type,
        temperature: Number(obj.temperature),
        ai_summary: obj.ai_summary,
      },
      related: {
        same_object: same_obj ?? [],
        same_tag: (same_tag as any[]) ?? [],
        same_category: (same_cat as any[]) ?? [],
      },
    };
  });

export const getObjectTimeline = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ object_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("observations")
      .select("id, case_code, summary, tags, evidence_level, impact_score, created_at")
      .eq("object_id", data.object_id)
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    return (rows ?? []).map((r) => ({
      id: r.id,
      case_code: r.case_code,
      summary: r.summary,
      tags: (r.tags as string[]) ?? [],
      evidence_level: r.evidence_level,
      impact_score: Number(r.impact_score) || 0,
      created_at: r.created_at,
    }));
  });

export const getEvidenceLibrary = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        page_size: z.number().int().min(1).max(50).default(20),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    const { data: rows, count } = await supabaseAdmin
      .from("observations")
      .select(
        `id, case_code, summary, tags, archive_category, reference_url, screenshot_url, created_at,
         objects!inner ( id, name, type, hidden, status )`,
        { count: "exact" },
      )
      .eq("status", "approved")
      .eq("evidence_level", "A")
      .order("created_at", { ascending: false })
      .range(from, to);

    const items = ((rows ?? []) as any[]).filter(
      (r) => r.objects && !r.objects.hidden && r.objects.status === "published",
    );
    return {
      items: items.map((r) => ({
        id: r.id,
        case_code: r.case_code,
        summary: r.summary,
        tags: (r.tags as string[]) ?? [],
        archive_category: r.archive_category,
        reference_url: r.reference_url,
        screenshot_url: r.screenshot_url,
        created_at: r.created_at,
        object: { id: r.objects.id, name: r.objects.name, type: r.objects.type },
      })),
      total: count ?? items.length,
      page: data.page,
      page_size: data.page_size,
    };
  });
