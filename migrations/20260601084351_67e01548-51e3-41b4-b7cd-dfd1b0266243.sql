
ALTER TABLE public.observations
  ADD COLUMN IF NOT EXISTS facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS confidence numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_score numeric NOT NULL DEFAULT 0;

ALTER TABLE public.objects
  ADD COLUMN IF NOT EXISTS frozen boolean NOT NULL DEFAULT false;
