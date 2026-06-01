
-- pg_trgm for similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extend observation_status enum
ALTER TYPE observation_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE observation_status ADD VALUE IF NOT EXISTS 'archived';

-- New enums
DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rejection_reason AS ENUM (
    'too_short','no_facts','pure_emotion','duplicate',
    'advertisement','personal_attack','defamation','off_topic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- observations extensions
ALTER TABLE public.observations
  ADD COLUMN IF NOT EXISTS risk_level risk_level NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason rejection_reason,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid,
  ADD COLUMN IF NOT EXISTS similarity_score numeric;

CREATE INDEX IF NOT EXISTS idx_obs_cleaned_trgm
  ON public.observations USING gin (cleaned_content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obs_object_status
  ON public.observations(object_id, status);

-- profiles extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reputation int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text;

-- profiles policy: user can update own (limited cols handled via app)
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- objects extensions
ALTER TABLE public.objects
  ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text;

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin inserts audit" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') AND actor_id = auth.uid());
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- reputation_events
CREATE TABLE IF NOT EXISTS public.reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta int NOT NULL,
  reason text NOT NULL,
  observation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reputation_events TO authenticated;
GRANT ALL ON public.reputation_events TO service_role;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own rep events" ON public.reputation_events
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

-- check submit limit
CREATE OR REPLACE FUNCTION public.check_user_submit_limit(_user uuid, _object uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_24h int;
  same_obj_24h int;
BEGIN
  SELECT count(*) INTO total_24h FROM observations
    WHERE user_id = _user AND created_at > now() - interval '24 hours';
  SELECT count(*) INTO same_obj_24h FROM observations
    WHERE user_id = _user AND object_id = _object AND created_at > now() - interval '24 hours';
  RETURN jsonb_build_object(
    'total_24h', total_24h,
    'same_object_24h', same_obj_24h,
    'allowed', (total_24h < 3 AND same_obj_24h < 1)
  );
END $$;

-- apply reputation delta
CREATE OR REPLACE FUNCTION public.apply_reputation_delta(
  _user uuid, _delta int, _reason text, _obs uuid
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_rep int;
BEGIN
  UPDATE profiles SET reputation = GREATEST(0, reputation + _delta)
    WHERE id = _user
  RETURNING reputation INTO new_rep;
  IF new_rep IS NULL THEN
    INSERT INTO profiles(id, reputation) VALUES (_user, GREATEST(0, 50 + _delta))
    ON CONFLICT (id) DO UPDATE SET reputation = GREATEST(0, profiles.reputation + _delta)
    RETURNING reputation INTO new_rep;
  END IF;
  -- auto_approve when reputation >= 80
  UPDATE profiles SET auto_approve = (new_rep >= 80) WHERE id = _user;
  INSERT INTO reputation_events(user_id, delta, reason, observation_id)
    VALUES (_user, _delta, _reason, _obs);
  RETURN new_rep;
END $$;
