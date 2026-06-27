-- Admin comment moderation uses server-side service role functions.
-- Remove browser-facing admin policies that invoke has_role() on comment tables.

DROP POLICY IF EXISTS "admin reads object comments" ON public.object_comments;
DROP POLICY IF EXISTS "admin reads comment reactions" ON public.object_comment_reactions;
DROP POLICY IF EXISTS "admin reads comment reports" ON public.object_comment_reports;
