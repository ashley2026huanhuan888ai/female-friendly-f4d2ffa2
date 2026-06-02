
ALTER TABLE public.observations ADD COLUMN IF NOT EXISTS source_status text;

INSERT INTO public.knowledge_tags (code, name_zh, weight, polarity, active)
VALUES
  ('body_shaming', '身体羞辱', 10, 'negative', true),
  ('sexist_marketing', '性别歧视营销', 10, 'negative', true),
  ('vulgar_edge_marketing', '低俗擦边营销', 7, 'negative', true)
ON CONFLICT (code) DO NOTHING;
