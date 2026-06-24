import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const shanghaiDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getShanghaiDateKey(date = new Date()) {
  const parts = shanghaiDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return date.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

function getOnlineSinceIso(date = new Date()) {
  return new Date(date.getTime() - ONLINE_WINDOW_MS).toISOString();
}

export const recordPresence = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        visitor_id: z.string().min(16).max(80).regex(VISITOR_ID_PATTERN),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const { error } = await supabaseAdmin.from("presence_sessions" as never).upsert(
      {
        visitor_id: data.visitor_id,
        last_seen_at: now.toISOString(),
        last_seen_date: getShanghaiDateKey(now),
      } as never,
      { onConflict: "visitor_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export async function getPresenceCounts() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const [online, today] = await Promise.all([
    supabaseAdmin
      .from("presence_sessions" as never)
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", getOnlineSinceIso(now)),
    supabaseAdmin
      .from("presence_sessions" as never)
      .select("*", { count: "exact", head: true })
      .eq("last_seen_date", getShanghaiDateKey(now)),
  ]);
  if (online.error) throw new Error(online.error.message);
  if (today.error) throw new Error(today.error.message);

  return {
    onlineNow: online.count ?? 0,
    todayOnline: today.count ?? 0,
  };
}
