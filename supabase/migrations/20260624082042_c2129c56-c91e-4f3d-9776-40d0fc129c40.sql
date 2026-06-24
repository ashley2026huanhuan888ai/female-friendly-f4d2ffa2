-- Restrict temperature_events.actor_id from public clients
REVOKE SELECT (actor_id) ON public.temperature_events FROM anon, authenticated;

-- Scope user_follows reads to participants
DROP POLICY IF EXISTS "follows readable by authenticated" ON public.user_follows;
CREATE POLICY "follows readable by participants"
  ON public.user_follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);
