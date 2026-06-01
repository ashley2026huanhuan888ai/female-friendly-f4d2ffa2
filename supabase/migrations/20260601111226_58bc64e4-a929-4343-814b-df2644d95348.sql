
-- Tag polarity
DO $$ BEGIN
  CREATE TYPE public.tag_polarity AS ENUM ('negative','positive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.knowledge_tags
  ADD COLUMN IF NOT EXISTS polarity public.tag_polarity NOT NULL DEFAULT 'negative';

-- Objects extension
ALTER TABLE public.objects
  ADD COLUMN IF NOT EXISTS last_cooled_at timestamptz,
  ADD COLUMN IF NOT EXISTS heat_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cooling_sources jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Temperature events
CREATE TABLE IF NOT EXISTS public.temperature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL,
  observation_id uuid,
  delta numeric NOT NULL DEFAULT 0,
  temperature_after numeric NOT NULL,
  reason text NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.temperature_events TO anon, authenticated;
GRANT ALL ON public.temperature_events TO service_role;
GRANT INSERT ON public.temperature_events TO authenticated;

ALTER TABLE public.temperature_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads temp events" ON public.temperature_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin writes temp events" ON public.temperature_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_temp_events_object ON public.temperature_events(object_id, created_at DESC);

-- Seed positive tags (idempotent on code)
INSERT INTO public.knowledge_tags(code, name_zh, weight, polarity, active) VALUES
  ('equal_expression', '平等表达', 5, 'positive', true),
  ('diverse_roles', '多元角色', 6, 'positive', true),
  ('professional_capability', '专业能力展示', 6, 'positive', true),
  ('respect_choice', '尊重选择', 5, 'positive', true),
  ('anti_stereotype', '反刻板印象', 7, 'positive', true),
  ('female_subjectivity', '女性主体性', 8, 'positive', true)
ON CONFLICT (code) DO NOTHING;
