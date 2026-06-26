
-- Reinforce column-level REVOKEs to mitigate sensitive field exposure
REVOKE SELECT (moderation_note) ON public.object_comments FROM anon, authenticated, PUBLIC;

REVOKE SELECT (email, bio, auto_approve, inviter_id, invite_code) ON public.profiles FROM anon, authenticated, PUBLIC;

-- Tighten profiles SELECT policy: drop overly-broad policy and add narrower ones.
DROP POLICY IF EXISTS "authenticated read public profile fields" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;

-- Owners can read their own row (full access; sensitive columns still gated by column GRANTs via get_my_profile RPC)
CREATE POLICY "profiles_self_read"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Other authenticated users may read non-sensitive columns only (enforced by column-level REVOKE above)
CREATE POLICY "profiles_others_read_public_cols"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() <> id);
