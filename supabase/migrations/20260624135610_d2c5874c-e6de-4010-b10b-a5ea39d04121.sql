
REVOKE ALL ON FUNCTION public.add_contribution(uuid,numeric,public.contribution_kind,text,uuid,uuid,uuid,int,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cascade_referral_bonus(uuid,numeric,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_observation_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fill_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calc_level(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calc_level(numeric) TO anon, authenticated;
