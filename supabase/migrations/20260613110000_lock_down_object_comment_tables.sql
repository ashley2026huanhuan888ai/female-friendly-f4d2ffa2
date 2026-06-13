-- Public comment data is served through server functions with sanitized fields.
-- Keep storage tables out of the browser-facing Data API surface.

REVOKE ALL PRIVILEGES ON TABLE public.object_comments FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.object_comment_reactions FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.object_comment_reports FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.object_comments TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.object_comment_reactions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.object_comment_reports TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.user_roles TO service_role;

DROP POLICY IF EXISTS "public reads approved object comments" ON public.object_comments;
DROP POLICY IF EXISTS "users read own object comments" ON public.object_comments;
DROP POLICY IF EXISTS "admin reads object comments" ON public.object_comments;
DROP POLICY IF EXISTS "users read own comment reactions" ON public.object_comment_reactions;
DROP POLICY IF EXISTS "admin reads comment reactions" ON public.object_comment_reactions;
DROP POLICY IF EXISTS "users read own comment reports" ON public.object_comment_reports;
DROP POLICY IF EXISTS "admin reads comment reports" ON public.object_comment_reports;
DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;

ALTER TABLE public.object_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.refresh_object_comment_helpful_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_object_comment_report_count() FROM PUBLIC, anon, authenticated;
