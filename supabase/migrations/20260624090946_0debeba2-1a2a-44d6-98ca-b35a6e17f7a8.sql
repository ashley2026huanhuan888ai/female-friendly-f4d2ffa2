REVOKE SELECT (actor_id) ON public.temperature_events FROM anon, authenticated;
REVOKE SELECT (email, reputation, auto_approve) ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, bio, avatar_url, created_at) ON public.profiles TO anon, authenticated;
GRANT SELECT (email, reputation, auto_approve) ON public.profiles TO service_role;
GRANT SELECT (actor_id) ON public.temperature_events TO service_role;