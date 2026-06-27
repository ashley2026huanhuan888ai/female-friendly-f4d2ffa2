-- Restrict profiles to owner-only reads; drop broad authenticated SELECT
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

-- Restrict observations: remove broad anon/authenticated SELECT policy.
-- All app reads go through server functions using the service role.
DROP POLICY IF EXISTS "anyone reads approved obs" ON public.observations;
REVOKE SELECT ON public.observations FROM anon, authenticated;