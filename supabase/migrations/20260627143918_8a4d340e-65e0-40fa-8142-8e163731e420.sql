
-- Lock down column-level privileges on profiles
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name, bio, avatar_url) ON public.profiles TO authenticated;

REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, avatar_url, reputation, contribution_points, level, level_title, created_at) ON public.profiles TO authenticated;

-- Lock down temperature_events: hide actor_id and ip_hash
REVOKE SELECT ON public.temperature_events FROM authenticated, anon;
GRANT SELECT (id, object_id, observation_id, delta, temperature_after, reason, note, created_at) ON public.temperature_events TO authenticated;

-- Lock down object_comments: hide moderation_note and report_count from public
REVOKE SELECT ON public.object_comments FROM authenticated, anon;
GRANT SELECT (id, object_id, user_id, parent_id, body, status, helpful_count, created_at, updated_at) ON public.object_comments TO authenticated;
