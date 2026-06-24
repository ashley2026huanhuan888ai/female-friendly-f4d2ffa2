
-- ============ 1. profiles 扩展字段 ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contribution_points numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS inviter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_title text NOT NULL DEFAULT '萌新';

-- 允许 prevent_profile_escalation 不阻止这些新字段的合法变更（由 SECURITY DEFINER 函数更新，绕过 RLS，但 BEFORE UPDATE 触发器仍会跑）
-- 修改触发函数以保护新增字段
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.reputation := OLD.reputation;
    NEW.auto_approve := OLD.auto_approve;
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    -- 积分相关字段普通用户不可改
    NEW.contribution_points := OLD.contribution_points;
    NEW.level := OLD.level;
    NEW.level_title := OLD.level_title;
    NEW.invite_code := OLD.invite_code;
    -- inviter_id 仅在原值为 NULL 时允许写入一次（首次绑定）
    IF OLD.inviter_id IS NOT NULL THEN
      NEW.inviter_id := OLD.inviter_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ============ 2. 邀请码生成函数 ============
CREATE OR REPLACE FUNCTION public.gen_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; -- Crockford base32
  code text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random()*32)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = code);
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'invite code generation failed'; END IF;
  END LOOP;
  RETURN code;
END $$;

-- 触发器：插入 profile 时自动生成 invite_code
CREATE OR REPLACE FUNCTION public.fill_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.gen_invite_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fill_invite_code ON public.profiles;
CREATE TRIGGER trg_fill_invite_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fill_invite_code();

-- 回填已有用户邀请码
UPDATE public.profiles SET invite_code = public.gen_invite_code() WHERE invite_code IS NULL;

-- ============ 3. contribution_events 流水表 ============
DO $$ BEGIN
  CREATE TYPE public.contribution_kind AS ENUM ('observation_temp','invite_signup','referral_bonus','admin_adjust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.contribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta numeric(12,2) NOT NULL,
  kind public.contribution_kind NOT NULL,
  reason text NOT NULL DEFAULT '',
  source_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observation_id uuid,
  temperature_event_id uuid REFERENCES public.temperature_events(id) ON DELETE SET NULL,
  depth int,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contrib_obs_temp
  ON public.contribution_events(user_id, temperature_event_id)
  WHERE kind = 'observation_temp';
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrib_referral
  ON public.contribution_events(user_id, temperature_event_id, source_user_id, depth)
  WHERE kind = 'referral_bonus';
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrib_invite_signup
  ON public.contribution_events(user_id, source_user_id)
  WHERE kind = 'invite_signup';
CREATE INDEX IF NOT EXISTS idx_contrib_user_time ON public.contribution_events(user_id, created_at DESC);

GRANT SELECT ON public.contribution_events TO authenticated;
GRANT ALL ON public.contribution_events TO service_role;
ALTER TABLE public.contribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own contrib events" ON public.contribution_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ 4. invite_relations 闭包表 ============
CREATE TABLE IF NOT EXISTS public.invite_relations (
  ancestor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descendant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  depth int NOT NULL CHECK (depth >= 1 AND depth <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ancestor_id, descendant_id)
);
CREATE INDEX IF NOT EXISTS idx_invrel_desc ON public.invite_relations(descendant_id);
CREATE INDEX IF NOT EXISTS idx_invrel_anc ON public.invite_relations(ancestor_id, depth);

GRANT SELECT ON public.invite_relations TO authenticated;
GRANT ALL ON public.invite_relations TO service_role;
ALTER TABLE public.invite_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own invite relations" ON public.invite_relations
  FOR SELECT TO authenticated
  USING (ancestor_id = auth.uid() OR descendant_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ 5. contribution_levels 等级配置表 ============
CREATE TABLE IF NOT EXISTS public.contribution_levels (
  level int PRIMARY KEY,
  min_points numeric(12,2) NOT NULL,
  title text NOT NULL,
  badge text NOT NULL DEFAULT ''
);

GRANT SELECT ON public.contribution_levels TO anon, authenticated;
GRANT ALL ON public.contribution_levels TO service_role;
ALTER TABLE public.contribution_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads levels" ON public.contribution_levels
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin writes levels" ON public.contribution_levels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.contribution_levels(level,min_points,title,badge) VALUES
  (1, 0,    '萌新',   '🌱'),
  (2, 10,   '关注者', '👀'),
  (3, 50,   '观察员', '🔍'),
  (4, 200,  '记录者', '✍️'),
  (5, 500,  '守望者', '🛡️'),
  (6, 1500, '灯塔',   '🗼'),
  (7, 5000, '大姐大', '👑')
ON CONFLICT (level) DO NOTHING;

-- ============ 6. 等级计算函数 ============
CREATE OR REPLACE FUNCTION public.calc_level(_points numeric)
RETURNS TABLE(level int, title text)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT l.level, l.title
  FROM public.contribution_levels l
  WHERE l.min_points <= COALESCE(_points,0)
  ORDER BY l.min_points DESC LIMIT 1
$$;

-- ============ 7. 核心：发放积分函数 ============
CREATE OR REPLACE FUNCTION public.add_contribution(
  _user uuid, _delta numeric, _kind public.contribution_kind,
  _reason text, _source uuid, _obs uuid, _temp uuid, _depth int, _meta jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  new_total numeric;
  lv record;
BEGIN
  IF _delta = 0 OR _user IS NULL THEN RETURN; END IF;

  -- 插入流水（去重靠唯一索引）
  BEGIN
    INSERT INTO public.contribution_events(user_id, delta, kind, reason, source_user_id, observation_id, temperature_event_id, depth, metadata)
    VALUES (_user, _delta, _kind, COALESCE(_reason,''), _source, _obs, _temp, _depth, COALESCE(_meta,'{}'::jsonb));
  EXCEPTION WHEN unique_violation THEN
    RETURN; -- 重复发放，忽略
  END;

  -- 累加积分
  UPDATE public.profiles
    SET contribution_points = GREATEST(0, contribution_points + _delta)
    WHERE id = _user
  RETURNING contribution_points INTO new_total;

  IF new_total IS NULL THEN
    INSERT INTO public.profiles(id, contribution_points) VALUES (_user, GREATEST(0, _delta))
    ON CONFLICT (id) DO UPDATE SET contribution_points = GREATEST(0, public.profiles.contribution_points + _delta)
    RETURNING contribution_points INTO new_total;
  END IF;

  -- 更新等级
  SELECT * INTO lv FROM public.calc_level(new_total);
  IF lv.level IS NOT NULL THEN
    UPDATE public.profiles SET level = lv.level, level_title = lv.title WHERE id = _user;
  END IF;
END $$;

-- ============ 8. 多级返利 ============
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
    coef := CASE rel.depth WHEN 1 THEN 0.10 WHEN 2 THEN 0.03 WHEN 3 THEN 0.01 ELSE 0 END;
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

-- ============ 9. 观察提温触发：发分 ============
CREATE OR REPLACE FUNCTION public.award_observation_points()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  gained numeric;
BEGIN
  IF NEW.delta IS NULL OR NEW.delta <= 0 OR NEW.actor_id IS NULL THEN
    RETURN NEW;
  END IF;
  gained := round(NEW.delta::numeric / 10.0, 2);
  IF gained <= 0 THEN RETURN NEW; END IF;

  PERFORM public.add_contribution(
    NEW.actor_id, gained, 'observation_temp',
    '观察提升对象温度 +'||NEW.delta||'°', NULL, NEW.observation_id, NEW.id, NULL,
    jsonb_build_object('object_id', NEW.object_id, 'temp_delta', NEW.delta)
  );

  PERFORM public.cascade_referral_bonus(NEW.actor_id, gained, NEW.id, NEW.observation_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_award_obs_points ON public.temperature_events;
CREATE TRIGGER trg_award_obs_points
  AFTER INSERT ON public.temperature_events
  FOR EACH ROW EXECUTE FUNCTION public.award_observation_points();

-- ============ 10. 邀请绑定函数 ============
CREATE OR REPLACE FUNCTION public.bind_inviter(_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  inviter uuid;
  existing uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;

  SELECT inviter_id INTO existing FROM public.profiles WHERE id = me;
  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_bound');
  END IF;

  SELECT id INTO inviter FROM public.profiles WHERE invite_code = upper(trim(_code));
  IF inviter IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;
  IF inviter = me THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self');
  END IF;
  -- 防循环：inviter 不能是 me 的下线
  IF EXISTS (SELECT 1 FROM public.invite_relations WHERE ancestor_id = me AND descendant_id = inviter) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cycle');
  END IF;

  UPDATE public.profiles SET inviter_id = inviter WHERE id = me;

  -- 写闭包：me 直接挂在 inviter 下，并继承 inviter 的所有上线（depth+1，最多 5 级）
  INSERT INTO public.invite_relations(ancestor_id, descendant_id, depth)
  VALUES (inviter, me, 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.invite_relations(ancestor_id, descendant_id, depth)
  SELECT r.ancestor_id, me, r.depth + 1
  FROM public.invite_relations r
  WHERE r.descendant_id = inviter AND r.depth + 1 <= 5
  ON CONFLICT DO NOTHING;

  -- 给直接邀请人 +5
  PERFORM public.add_contribution(
    inviter, 5, 'invite_signup', '邀请新用户注册', me, NULL, NULL, 1,
    '{}'::jsonb
  );

  RETURN jsonb_build_object('ok', true, 'inviter_id', inviter);
END $$;

GRANT EXECUTE ON FUNCTION public.bind_inviter(text) TO authenticated;

-- ============ 11. 历史回填 ============
DO $$
DECLARE
  r record;
  gained numeric;
BEGIN
  FOR r IN SELECT * FROM public.temperature_events WHERE delta > 0 AND actor_id IS NOT NULL ORDER BY created_at LOOP
    gained := round(r.delta::numeric / 10.0, 2);
    IF gained > 0 THEN
      PERFORM public.add_contribution(
        r.actor_id, gained, 'observation_temp',
        '观察提升对象温度 +'||r.delta||'°（历史回填）',
        NULL, r.observation_id, r.id, NULL,
        jsonb_build_object('object_id', r.object_id, 'temp_delta', r.delta, 'backfill', true)
      );
    END IF;
  END LOOP;
END $$;
