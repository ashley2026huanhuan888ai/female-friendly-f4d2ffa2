
-- Remove broad anon/authenticated read on the base table; we'll expose a safe view instead.
DROP POLICY IF EXISTS "anyone reads approved obs" ON public.observations;

-- Safe, public-facing view of approved observations (excludes moderation/risk/user_id columns).
CREATE OR REPLACE VIEW public.observations_public
WITH (security_invoker = false) AS
SELECT
  id,
  object_id,
  content,
  cleaned_content,
  summary,
  facts,
  tags,
  cases_cited,
  evidence_level,
  impact_score,
  scene,
  reference_url,
  screenshot_url,
  case_code,
  archive_category,
  status,
  created_at,
  updated_at
FROM public.observations
WHERE status = 'approved';

REVOKE ALL ON public.observations_public FROM PUBLIC;
GRANT SELECT ON public.observations_public TO anon, authenticated;
