CREATE TABLE public.platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  contact text,
  contact_type text,
  status text NOT NULL DEFAULT 'new',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_feedback TO authenticated;
GRANT INSERT ON public.platform_feedback TO anon;
GRANT ALL ON public.platform_feedback TO service_role;

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_submit_feedback" ON public.platform_feedback
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admins_can_read_feedback" ON public.platform_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_update_feedback" ON public.platform_feedback
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_delete_feedback" ON public.platform_feedback
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_platform_feedback_updated_at
  BEFORE UPDATE ON public.platform_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();