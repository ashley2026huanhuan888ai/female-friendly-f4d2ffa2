
-- profiles 扩展
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 允许已登录用户查看其他人资料（敏感字段在应用层过滤）
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- 直接私信表
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (sender_id <> recipient_id)
);

GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm participants can read" ON public.direct_messages;
CREATE POLICY "dm participants can read" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, recipient_id));

DROP POLICY IF EXISTS "dm sender can insert" ON public.direct_messages;
CREATE POLICY "dm sender can insert" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND recipient_id <> auth.uid());

DROP POLICY IF EXISTS "dm recipient can mark read" ON public.direct_messages;
CREATE POLICY "dm recipient can mark read" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS dm_pair_created_idx
  ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_recipient_unread_idx
  ON public.direct_messages (recipient_id, read_at);
