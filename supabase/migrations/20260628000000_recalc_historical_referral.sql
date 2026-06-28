-- ============================================================
-- 按新规则（L1/L2/L3 统一 10%）重新计算历史返利积分
-- ============================================================

DO $$
DECLARE
  rec record;
  old_coef numeric;
  new_coef numeric;
  new_bonus numeric;
  delta_diff numeric;
  affected_count int := 0;
BEGIN
  -- 遍历所有 L2 (0.03) 和 L3 (0.01) 的历史返利记录
  FOR rec IN
    SELECT c.id, c.user_id, c.delta, (c.meta->>'coef')::numeric AS coef, (c.meta->>'base')::numeric AS base
    FROM public.contributions c
    WHERE c.kind = 'referral_bonus'
      AND c.meta->>'coef' IN ('0.03', '0.01')
  LOOP
    old_coef := rec.coef;
    new_bonus := round(rec.base * 0.10, 2);
    delta_diff := new_bonus - rec.delta;

    IF delta_diff = 0 THEN
      CONTINUE;
    END IF;

    -- 更新 contribution 记录：delta 和 meta.coef
    UPDATE public.contributions
    SET delta = new_bonus,
        meta = jsonb_set(meta, '{coef}', to_jsonb(0.10))
    WHERE id = rec.id;

    -- 更新用户总积分
    UPDATE public.profiles
    SET points = points + delta_diff
    WHERE id = rec.user_id;

    affected_count := affected_count + 1;
  END LOOP;

  RAISE NOTICE '已修正 % 条历史返利记录（L2/L3 系数 0.03/0.01 → 0.10）', affected_count;
END $$;
