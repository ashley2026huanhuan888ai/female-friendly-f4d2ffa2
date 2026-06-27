
-- profiles: replace permissive "true" policy with authenticated-only, and revoke sensitive columns
DROP POLICY IF EXISTS "public profile fields readable" ON public.profiles;

CREATE POLICY "authenticated read public profile fields"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT (email, invite_code, inviter_id, auto_approve, reputation, bio)
  ON public.profiles FROM anon, authenticated;

-- temperature_events: restrict reads to authenticated and hide admin actor_id
DROP POLICY IF EXISTS "anyone reads temp events" ON public.temperature_events;

CREATE POLICY "authenticated reads temp events"
  ON public.temperature_events
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT (actor_id) ON public.temperature_events FROM anon, authenticated;
