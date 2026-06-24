CREATE TABLE public.object_boycotts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, object_id)
);

CREATE INDEX object_boycotts_object_id_idx ON public.object_boycotts(object_id);

GRANT SELECT ON public.object_boycotts TO anon;
GRANT SELECT, INSERT, DELETE ON public.object_boycotts TO authenticated;
GRANT ALL ON public.object_boycotts TO service_role;

ALTER TABLE public.object_boycotts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read boycotts"
  ON public.object_boycotts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "users insert own boycott"
  ON public.object_boycotts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own boycott"
  ON public.object_boycotts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);