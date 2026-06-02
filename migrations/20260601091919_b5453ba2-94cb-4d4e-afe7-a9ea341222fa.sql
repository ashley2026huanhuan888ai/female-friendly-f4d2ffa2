-- 案例编号序列
CREATE SEQUENCE IF NOT EXISTS public.case_code_seq START 1;

-- 新字段
ALTER TABLE public.observations
  ADD COLUMN IF NOT EXISTS case_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS archive_category text;

-- 根据对象 type 推导档案分类
CREATE OR REPLACE FUNCTION public.derive_archive_category(_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _type
    WHEN 'brand' THEN '消费案例'
    WHEN 'product' THEN '消费案例'
    WHEN 'service' THEN '消费案例'
    WHEN 'organization' THEN '职场案例'
    WHEN 'film' THEN '影视案例'
    WHEN 'show' THEN '影视案例'
    WHEN 'game' THEN '影视案例'
    WHEN 'event' THEN '公共事件案例'
    ELSE '其他案例'
  END
$$;

-- 触发器：插入观察时若无 case_code 则生成；若无 archive_category 则按对象 type 推导
CREATE OR REPLACE FUNCTION public.fill_observation_archive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  obj_type text;
BEGIN
  IF NEW.case_code IS NULL THEN
    NEW.case_code := 'FET-' || lpad(nextval('public.case_code_seq')::text, 6, '0');
  END IF;
  IF NEW.archive_category IS NULL THEN
    SELECT type::text INTO obj_type FROM public.objects WHERE id = NEW.object_id;
    NEW.archive_category := public.derive_archive_category(obj_type);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS observations_fill_archive ON public.observations;
CREATE TRIGGER observations_fill_archive
BEFORE INSERT ON public.observations
FOR EACH ROW EXECUTE FUNCTION public.fill_observation_archive_fields();

-- 回填存量
UPDATE public.observations o
SET case_code = 'FET-' || lpad(nextval('public.case_code_seq')::text, 6, '0')
WHERE case_code IS NULL;

UPDATE public.observations o
SET archive_category = public.derive_archive_category(obj.type::text)
FROM public.objects obj
WHERE o.object_id = obj.id AND o.archive_category IS NULL;

-- 索引
CREATE INDEX IF NOT EXISTS idx_obs_status_created ON public.observations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_archive_cat ON public.observations(archive_category);
CREATE INDEX IF NOT EXISTS idx_obs_evidence ON public.observations(evidence_level);
CREATE INDEX IF NOT EXISTS idx_obs_object_status ON public.observations(object_id, status);