-- Object discussion layer: comments are community context, not temperature inputs.

CREATE TABLE IF NOT EXISTS public.object_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.object_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 2 AND 800),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  moderation_note text,
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  report_count integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_comments_object_status_created
  ON public.object_comments(object_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_object_comments_user_created
  ON public.object_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_object_comments_status_created
  ON public.object_comments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_object_comments_reports
  ON public.object_comments(report_count DESC, created_at DESC)
  WHERE report_count > 0;

GRANT SELECT ON public.object_comments TO anon, authenticated;
GRANT ALL ON public.object_comments TO service_role;

ALTER TABLE public.object_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads approved object comments" ON public.object_comments;
DROP POLICY IF EXISTS "users read own object comments" ON public.object_comments;
DROP POLICY IF EXISTS "admin reads object comments" ON public.object_comments;

CREATE POLICY "public reads approved object comments" ON public.object_comments
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "users read own object comments" ON public.object_comments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads object comments" ON public.object_comments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.object_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.object_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'helpful' CHECK (reaction = 'helpful'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_object_comment_reactions_user
  ON public.object_comment_reactions(user_id, created_at DESC);

GRANT SELECT ON public.object_comment_reactions TO authenticated;
GRANT ALL ON public.object_comment_reactions TO service_role;

ALTER TABLE public.object_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own comment reactions" ON public.object_comment_reactions;
DROP POLICY IF EXISTS "admin reads comment reactions" ON public.object_comment_reactions;

CREATE POLICY "users read own comment reactions" ON public.object_comment_reactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads comment reactions" ON public.object_comment_reactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.object_comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.object_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL
    CHECK (reason IN ('spam', 'personal_attack', 'privacy', 'false_info', 'off_topic', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_object_comment_reports_comment_status
  ON public.object_comment_reports(comment_id, status);
CREATE INDEX IF NOT EXISTS idx_object_comment_reports_status_created
  ON public.object_comment_reports(status, created_at DESC);

GRANT SELECT ON public.object_comment_reports TO authenticated;
GRANT ALL ON public.object_comment_reports TO service_role;

ALTER TABLE public.object_comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own comment reports" ON public.object_comment_reports;
DROP POLICY IF EXISTS "admin reads comment reports" ON public.object_comment_reports;

CREATE POLICY "users read own comment reports" ON public.object_comment_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads comment reports" ON public.object_comment_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.refresh_object_comment_helpful_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_comment uuid;
BEGIN
  target_comment := COALESCE(NEW.comment_id, OLD.comment_id);
  UPDATE public.object_comments
  SET helpful_count = (
    SELECT count(*)::integer
    FROM public.object_comment_reactions
    WHERE comment_id = target_comment AND reaction = 'helpful'
  )
  WHERE id = target_comment;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_object_comment_report_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_comment uuid;
BEGIN
  target_comment := COALESCE(NEW.comment_id, OLD.comment_id);
  UPDATE public.object_comments
  SET report_count = (
    SELECT count(*)::integer
    FROM public.object_comment_reports
    WHERE comment_id = target_comment AND status = 'open'
  )
  WHERE id = target_comment;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS object_comment_reactions_refresh_count_insert
  ON public.object_comment_reactions;
DROP TRIGGER IF EXISTS object_comment_reactions_refresh_count_delete
  ON public.object_comment_reactions;
CREATE TRIGGER object_comment_reactions_refresh_count_insert
AFTER INSERT ON public.object_comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.refresh_object_comment_helpful_count();
CREATE TRIGGER object_comment_reactions_refresh_count_delete
AFTER DELETE ON public.object_comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.refresh_object_comment_helpful_count();

DROP TRIGGER IF EXISTS object_comment_reports_refresh_count_insert
  ON public.object_comment_reports;
DROP TRIGGER IF EXISTS object_comment_reports_refresh_count_update
  ON public.object_comment_reports;
DROP TRIGGER IF EXISTS object_comment_reports_refresh_count_delete
  ON public.object_comment_reports;
CREATE TRIGGER object_comment_reports_refresh_count_insert
AFTER INSERT ON public.object_comment_reports
FOR EACH ROW EXECUTE FUNCTION public.refresh_object_comment_report_count();
CREATE TRIGGER object_comment_reports_refresh_count_update
AFTER UPDATE OF status ON public.object_comment_reports
FOR EACH ROW EXECUTE FUNCTION public.refresh_object_comment_report_count();
CREATE TRIGGER object_comment_reports_refresh_count_delete
AFTER DELETE ON public.object_comment_reports
FOR EACH ROW EXECUTE FUNCTION public.refresh_object_comment_report_count();

DROP TRIGGER IF EXISTS object_comments_updated ON public.object_comments;
CREATE TRIGGER object_comments_updated
BEFORE UPDATE ON public.object_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS object_comment_reports_updated ON public.object_comment_reports;
CREATE TRIGGER object_comment_reports_updated
BEFORE UPDATE ON public.object_comment_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
