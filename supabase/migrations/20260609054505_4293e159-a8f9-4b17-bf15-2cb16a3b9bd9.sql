
-- 1) Make the public view respect caller permissions (fixes Security Definer View lint).
ALTER VIEW public.observations_public SET (security_invoker = true);

-- 2) Restore row-level read for approved observations (needed for the view + safe direct reads).
CREATE POLICY "anyone reads approved obs"
ON public.observations
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- 3) Column-level grants: restrict anon/authenticated to safe columns only.
REVOKE SELECT ON public.observations FROM anon, authenticated;

GRANT SELECT (
  id, object_id, content, cleaned_content, summary, facts, tags, cases_cited,
  evidence_level, impact_score, scene, reference_url, screenshot_url,
  case_code, archive_category, status, created_at, updated_at
) ON public.observations TO anon, authenticated;

-- Authenticated also keeps insert/update/delete (RLS still gates which rows).
GRANT INSERT, UPDATE, DELETE ON public.observations TO authenticated;
