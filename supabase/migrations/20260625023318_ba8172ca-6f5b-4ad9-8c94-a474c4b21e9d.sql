-- Fix EXPOSED_SENSITIVE_DATA findings

-- 1) object_boycotts: stop exposing per-user boycott rows to anon
DROP POLICY IF EXISTS "anyone can read boycotts" ON public.object_boycotts;
CREATE POLICY "users see own boycotts"
  ON public.object_boycotts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) profiles: revoke sensitive column SELECT from anon & authenticated.
--    Safe public columns (id, display_name, avatar_url, bio, level, level_title,
--    contribution_points, created_at) remain readable via existing USING(true) policy.
--    Sensitive own-row reads continue via SECURITY DEFINER fns / service_role.
REVOKE SELECT (email, invite_code, inviter_id, auto_approve, reputation)
  ON public.profiles FROM anon;
REVOKE SELECT (email, invite_code, inviter_id, auto_approve, reputation)
  ON public.profiles FROM authenticated;