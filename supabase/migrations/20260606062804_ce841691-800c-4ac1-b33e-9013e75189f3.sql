-- Restrict anonymous column access on observations to non-sensitive columns only.
REVOKE SELECT ON public.observations FROM anon;
GRANT SELECT (
  id, object_id, user_id, content, scene, screenshot_url, reference_url,
  cleaned_content, evidence_level, tags, status, created_at, updated_at,
  case_code, archive_category, principles_matched, explanation, source_status,
  facts, summary, impact_score, cases_cited
) ON public.observations TO anon;