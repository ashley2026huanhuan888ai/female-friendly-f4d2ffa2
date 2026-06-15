-- object_comments: hide internal moderation note from public/authenticated reads
REVOKE SELECT (moderation_note) ON public.object_comments FROM anon, authenticated;

-- observations: hide sensitive moderation/scoring columns and submitter identity
REVOKE SELECT (
  admin_note,
  risk_level,
  risk_reasons,
  confidence,
  similarity_score,
  duplicate_of,
  rejection_reason,
  principles_matched,
  explanation,
  source_status,
  user_id
) ON public.observations FROM anon, authenticated;

-- temperature_events: hide admin actor identity
REVOKE SELECT (actor_id) ON public.temperature_events FROM anon, authenticated;