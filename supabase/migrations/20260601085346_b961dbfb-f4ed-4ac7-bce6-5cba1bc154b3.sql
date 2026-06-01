
REVOKE EXECUTE ON FUNCTION public.check_user_submit_limit(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_reputation_delta(uuid, int, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_submit_limit(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_reputation_delta(uuid, int, text, uuid) TO service_role;
