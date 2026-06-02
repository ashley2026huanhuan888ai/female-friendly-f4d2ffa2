
-- Knowledge Engine V1: principles, tags, cases, citations

CREATE TABLE public.principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 1.0,
  active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.principles TO anon, authenticated;
GRANT ALL ON public.principles TO service_role;
ALTER TABLE public.principles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active principles" ON public.principles FOR SELECT TO anon, authenticated USING (active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admin writes principles" ON public.principles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.knowledge_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_zh text NOT NULL,
  name_en text,
  description text,
  weight numeric NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  merged_into uuid REFERENCES public.knowledge_tags(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_tags TO anon, authenticated;
GRANT ALL ON public.knowledge_tags TO service_role;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads tags" ON public.knowledge_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin writes tags" ON public.knowledge_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TYPE case_polarity AS ENUM ('positive', 'negative', 'controversial');
CREATE TYPE case_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.knowledge_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  detail text,
  polarity case_polarity NOT NULL,
  status case_status NOT NULL DEFAULT 'draft',
  tags jsonb NOT NULL DEFAULT '[]',
  principles jsonb NOT NULL DEFAULT '[]',
  source_url text,
  featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_cases TO anon, authenticated;
GRANT ALL ON public.knowledge_cases TO service_role;
ALTER TABLE public.knowledge_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads published cases" ON public.knowledge_cases FOR SELECT TO anon, authenticated USING (status = 'published' OR has_role(auth.uid(), 'admin'));
CREATE POLICY "admin writes cases" ON public.knowledge_cases FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 案例编号序列
CREATE SEQUENCE IF NOT EXISTS public.case_kb_seq START 1;

-- 自动填充 code
CREATE OR REPLACE FUNCTION public.fill_knowledge_case_code() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'KB-' || lpad(nextval('public.case_kb_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fill_kb_case_code BEFORE INSERT ON public.knowledge_cases
FOR EACH ROW EXECUTE FUNCTION public.fill_knowledge_case_code();

CREATE TRIGGER trg_kb_cases_updated BEFORE UPDATE ON public.knowledge_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_kb_tags_updated BEFORE UPDATE ON public.knowledge_tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_principles_updated BEFORE UPDATE ON public.principles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 观察增加解释性字段
ALTER TABLE public.observations
  ADD COLUMN IF NOT EXISTS principles_matched jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cases_cited jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS explanation text;

-- 索引
CREATE INDEX IF NOT EXISTS idx_kb_cases_polarity ON public.knowledge_cases(polarity, status);
CREATE INDEX IF NOT EXISTS idx_kb_cases_tags ON public.knowledge_cases USING GIN(tags);

-- 种子数据：原则
INSERT INTO public.principles (code, name, description, weight, display_order) VALUES
  ('subjectivity','主体性','女性作为独立主体被呈现与对待',1.0,1),
  ('equal_voice','平等表达','女性观点与男性观点获得同等表达空间',1.0,2),
  ('non_instrumentalization','非工具化','女性不被作为推动他人故事或商业目标的工具',1.0,3),
  ('non_humiliation','非羞辱化','不以性别为由进行羞辱、贬低、嘲讽',1.0,4),
  ('non_objectification','非物化','身体不被作为可消费的物品呈现',1.0,5),
  ('fair_opportunity','公平机会','在能力、岗位、机会上获得公平对待',1.0,6),
  ('respect_choice','尊重选择','尊重婚育、职业、外貌等个人选择',1.0,7),
  ('anti_stereotype','反刻板印象','不强化性别刻板印象与角色固化',1.0,8)
ON CONFLICT (code) DO NOTHING;

-- 种子数据：标签
INSERT INTO public.knowledge_tags (code, name_zh, name_en, description, weight) VALUES
  ('objectification','女性物化','Objectification','将女性身体作为可消费对象呈现',8),
  ('male_gaze','男性凝视','Male Gaze','以男性视角对女性进行观看式呈现',6),
  ('gender_role_fixation','性别角色固化','Gender Role Fixation','强化传统性别角色分工与期待',8),
  ('competence_devaluation','能力贬低','Competence Devaluation','贬低或否定女性专业能力',9),
  ('appearance_discipline','容貌规训','Appearance Discipline','对女性外貌进行规训与评判',6),
  ('reproductive_discipline','生育规训','Reproductive Discipline','对生育选择进行规训与施压',10),
  ('sexual_shaming','性羞辱','Sexual Shaming','以性为由进行羞辱',10),
  ('victim_blaming','受害者归因','Victim Blaming','将责任归咎于受害者',10),
  ('female_instrumentalization','女性工具化','Female Instrumentalization','女性作为他人叙事或商业目标的工具',7),
  ('pseudo_empowerment','伪赋权','Pseudo Empowerment','以赋权为名实则强化刻板印象',5)
ON CONFLICT (code) DO NOTHING;
