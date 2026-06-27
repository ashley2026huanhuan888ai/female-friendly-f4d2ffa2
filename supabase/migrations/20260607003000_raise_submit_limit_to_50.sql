-- Raise user observation quota from 3 to 50 per 24 hours.
-- Keep the per-object rule: ten observations per object per user per 24 hours.
CREATE OR REPLACE FUNCTION public.check_user_submit_limit(_user uuid, _object uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'allowed', (total_24h < 50 AND same_obj_24h < 10)
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.check_user_submit_limit(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_submit_limit(uuid, uuid)
  TO service_role;
