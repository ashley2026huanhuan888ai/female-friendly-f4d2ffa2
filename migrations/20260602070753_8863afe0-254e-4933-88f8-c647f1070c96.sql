INSERT INTO public.knowledge_tags (code, name_zh, name_en, weight, polarity, active)
VALUES ('sexual_violence_implication', '性暴力暗示 / 迷奸语境', 'Sexual violence implication', 12, 'negative', true)
ON CONFLICT (code) DO UPDATE SET name_zh = EXCLUDED.name_zh, weight = EXCLUDED.weight, polarity = EXCLUDED.polarity, active = true;