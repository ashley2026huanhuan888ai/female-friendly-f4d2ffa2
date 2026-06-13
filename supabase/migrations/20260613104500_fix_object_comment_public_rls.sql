-- Admin comment moderation uses server-side service role functions.
-- Keep public comment tables readable without requiring anon to execute has_role().

DROP POLICY IF EXISTS "admin reads object comments" ON public.object_comments;
DROP POLICY IF EXISTS "admin reads comment reactions" ON public.object_comment_reactions;
DROP POLICY IF EXISTS "admin reads comment reports" ON public.object_comment_reports;
