import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ObjectDedupeRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  hidden: boolean;
  merged_into: string | null;
  observation_count: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeObjectName(name: string): string {
  return name
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\u3000\s]+/g, "")
    .toLowerCase()
    .trim();
}

function rankObjectForMerge(o: ObjectDedupeRow) {
  return [
    o.merged_into ? 0 : 1,
    o.status === "published" ? 1 : 0,
    o.hidden ? 0 : 1,
    Number(o.observation_count ?? 0),
    -new Date(o.created_at).getTime(),
  ];
}

function compareRank(a: ObjectDedupeRow, b: ObjectDedupeRow) {
  const ar = rankObjectForMerge(a);
  const br = rankObjectForMerge(b);
  for (let i = 0; i < ar.length; i++) {
    if (ar[i] !== br[i]) return br[i] - ar[i];
  }
  return a.id.localeCompare(b.id);
}

export function chooseCanonicalObject(
  objects: ObjectDedupeRow[],
  preferredObjectId?: string | null,
): ObjectDedupeRow | null {
  if (preferredObjectId) {
    const preferred = objects.find((o) => o.id === preferredObjectId && !o.merged_into);
    if (preferred) return preferred;
  }
  return [...objects].filter((o) => !o.merged_into).sort(compareRank)[0] ?? objects[0] ?? null;
}

export async function findSameNameObjects(name: string): Promise<ObjectDedupeRow[]> {
  const trimmed = name.trim();
  const target = normalizeObjectName(trimmed);
  if (!target) return [];

  const { data, error } = await supabaseAdmin
    .from("objects")
    .select(
      "id,name,type,status,hidden,merged_into,observation_count,description,created_at,updated_at",
    )
    .limit(1000);
  if (error) throw new Error(error.message);

  return ((data ?? []) as ObjectDedupeRow[]).filter((o) => normalizeObjectName(o.name) === target);
}

export async function findCanonicalObjectByName(name: string): Promise<ObjectDedupeRow | null> {
  const objects = await findSameNameObjects(name);
  return chooseCanonicalObject(objects);
}

export async function mergeObjectIntoTarget(input: {
  sourceId: string;
  targetId: string;
  actorId: string;
  reason?: string | null;
  action?: string;
}) {
  if (input.sourceId === input.targetId) return { merged: false };

  const { data: source } = await supabaseAdmin
    .from("objects")
    .select("id, name, merged_into")
    .eq("id", input.sourceId)
    .maybeSingle();
  if (!source || source.merged_into === input.targetId) return { merged: false };

  const { error: obsError } = await supabaseAdmin
    .from("observations")
    .update({ object_id: input.targetId })
    .eq("object_id", input.sourceId);
  if (obsError) throw new Error(obsError.message);

  const { error: objectError } = await supabaseAdmin
    .from("objects")
    .update({ merged_into: input.targetId, hidden: true })
    .eq("id", input.sourceId);
  if (objectError) throw new Error(objectError.message);

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action ?? "merge",
    target_type: "object",
    target_id: input.sourceId,
    before: { source_id: input.sourceId } as never,
    after: { target_id: input.targetId } as never,
    reason: input.reason ?? null,
  });

  return { merged: true };
}

export async function autoMergeSameNameObjects(input: {
  name: string;
  actorId: string;
  preferredObjectId?: string | null;
  reason?: string | null;
}) {
  const objects = await findSameNameObjects(input.name);
  const target = chooseCanonicalObject(objects, input.preferredObjectId);
  if (!target) return { targetId: null, mergedSourceIds: [] as string[] };

  const mergedSourceIds: string[] = [];
  for (const source of objects) {
    if (source.id === target.id || source.merged_into) continue;
    const { merged } = await mergeObjectIntoTarget({
      sourceId: source.id,
      targetId: target.id,
      actorId: input.actorId,
      reason: input.reason ?? `同名对象自动合并：${input.name}`,
      action: "auto_merge_same_name",
    });
    if (merged) mergedSourceIds.push(source.id);
  }

  return { targetId: target.id, mergedSourceIds };
}
