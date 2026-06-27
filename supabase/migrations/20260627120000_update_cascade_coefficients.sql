-- ============================================================
-- A1: 修改下线返利系数为 L1/L2/L3 统一 10%
-- 原: L1 0.10 / L2 0.03 / L3 0.01
-- 新: L1 0.10 / L2 0.10 / L3 0.10
-- ============================================================
CREATE OR REPLACE FUNCTION public.cascade_referral_bonus(
  _user uuid, _gained numeric, _temp uuid, _obs uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  rel record;
  coef numeric;
  bonus numeric;
BEGIN
  IF _gained <= 0 THEN RETURN; END IF;
  FOR rel IN
    SELECT ancestor_id, depth FROM public.invite_relations
    WHERE descendant_id = _user AND depth <= 3
    ORDER BY depth
  LOOP
    coef := CASE rel.depth WHEN 1 THEN 0.10 WHEN 2 THEN 0.10 WHEN 3 THEN 0.10 ELSE 0 END;
    bonus := round(_gained * coef, 2);
    IF bonus > 0 THEN
      PERFORM public.add_contribution(
        rel.ancestor_id, bonus, 'referral_bonus',
        '下线贡献返利 L'||rel.depth, _user, _obs, _temp, rel.depth,
        jsonb_build_object('coef', coef, 'base', _gained)
      );
    END IF;
  END LOOP;
END $$;
