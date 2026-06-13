
-- object_comments
CREATE TABLE public.object_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.object_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  moderation_note text,
  helpful_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX object_comments_object_idx ON public.object_comments(object_id, status, created_at DESC);
CREATE INDEX object_comments_user_idx ON public.object_comments(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.object_comments TO authenticated;
GRANT SELECT ON public.object_comments TO anon;
GRANT ALL ON public.object_comments TO service_role;

ALTER TABLE public.object_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved comments are public"
  ON public.object_comments FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own comments"
  ON public.object_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending comments"
  ON public.object_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete comments"
  ON public.object_comments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER object_comments_set_updated_at
  BEFORE UPDATE ON public.object_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- object_comment_reactions
CREATE TABLE public.object_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.object_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'helpful' CHECK (reaction IN ('helpful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, reaction)
);

GRANT SELECT, INSERT, DELETE ON public.object_comment_reactions TO authenticated;
GRANT ALL ON public.object_comment_reactions TO service_role;

ALTER TABLE public.object_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reactions"
  ON public.object_comment_reactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own reactions"
  ON public.object_comment_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reactions"
  ON public.object_comment_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_comment_helpful_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.object_comments SET helpful_count = helpful_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.object_comments SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER object_comment_reactions_count
  AFTER INSERT OR DELETE ON public.object_comment_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_helpful_count();

-- object_comment_reports
CREATE TABLE public.object_comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.object_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.object_comment_reports TO authenticated;
GRANT ALL ON public.object_comment_reports TO service_role;

ALTER TABLE public.object_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reports or admin"
  ON public.object_comment_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own reports"
  ON public.object_comment_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update reports"
  ON public.object_comment_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.sync_comment_report_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.object_comments SET report_count = report_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.object_comments SET report_count = GREATEST(0, report_count - 1) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER object_comment_reports_count
  AFTER INSERT OR DELETE ON public.object_comment_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_report_count();
