import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SEND_RATE_LIMIT_PER_HOUR = 60;

function authorLabel(name: string | null | undefined) {
  const v = name?.trim();
  return v || "平台用户";
}

async function attachProfiles(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (!unique.length) return map;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", unique);
  for (const p of data ?? []) {
    map.set(p.id, { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null });
  }
  return map;
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const byPeer = new Map<
      string,
      { last: typeof rows[number]; unread: number }
    >();
    for (const m of rows ?? []) {
      const peer = m.sender_id === context.userId ? m.recipient_id : m.sender_id;
      const entry = byPeer.get(peer);
      const isUnread = !m.read_at && m.recipient_id === context.userId;
      if (!entry) {
        byPeer.set(peer, { last: m, unread: isUnread ? 1 : 0 });
      } else if (isUnread) {
        entry.unread += 1;
      }
    }
    const peers = [...byPeer.keys()];
    const profiles = await attachProfiles(peers);
    const conversations = peers
      .map((peer) => {
        const { last, unread } = byPeer.get(peer)!;
        const p = profiles.get(peer);
        return {
          peer_id: peer,
          peer_label: authorLabel(p?.display_name),
          peer_avatar: p?.avatar_url ?? null,
          last_body: last.body,
          last_from_me: last.sender_id === context.userId,
          last_at: last.created_at,
          unread,
        };
      })
      .sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
    const total_unread = conversations.reduce((s, c) => s + c.unread, 0);
    return { conversations, total_unread };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        peer_id: z.string().uuid(),
        limit: z.number().int().min(1).max(200).default(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.peer_id === context.userId) throw new Error("不能与自己私信");
    const { data: rows, error } = await supabaseAdmin
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .or(
        `and(sender_id.eq.${context.userId},recipient_id.eq.${data.peer_id}),and(sender_id.eq.${data.peer_id},recipient_id.eq.${context.userId})`,
      )
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const profiles = await attachProfiles([data.peer_id, context.userId]);
    const peer = profiles.get(data.peer_id);
    return {
      peer: {
        id: data.peer_id,
        label: authorLabel(peer?.display_name),
        avatar: peer?.avatar_url ?? null,
      },
      messages: (rows ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        created_at: m.created_at,
        from_me: m.sender_id === context.userId,
        read_at: m.read_at,
      })),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        recipient_id: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.recipient_id === context.userId) throw new Error("不能与自己私信");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", context.userId)
      .gte("created_at", since);
    if ((count ?? 0) >= SEND_RATE_LIMIT_PER_HOUR) throw new Error("发送过于频繁，请稍后再试");

    const { data: recipientExists, error: recErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", data.recipient_id)
      .maybeSingle();
    if (recErr) throw new Error(recErr.message);
    if (!recipientExists) throw new Error("收件人不存在");

    const { data: inserted, error } = await supabaseAdmin
      .from("direct_messages")
      .insert({
        sender_id: context.userId,
        recipient_id: data.recipient_id,
        body: data.body.trim(),
      } as never)
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ peer_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("recipient_id", context.userId)
      .eq("sender_id", data.peer_id)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
