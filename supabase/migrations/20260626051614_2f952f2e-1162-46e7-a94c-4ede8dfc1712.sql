
CREATE TABLE IF NOT EXISTS public.page_content (
  slug TEXT PRIMARY KEY,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.page_content TO anon, authenticated;
GRANT ALL ON public.page_content TO service_role;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_content public read" ON public.page_content FOR SELECT USING (true);
