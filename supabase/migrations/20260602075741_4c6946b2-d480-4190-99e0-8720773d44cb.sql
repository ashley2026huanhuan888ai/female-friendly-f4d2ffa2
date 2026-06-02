ALTER TABLE public.objects ADD COLUMN IF NOT EXISTS is_public_preview boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_objects_public_preview ON public.objects(is_public_preview) WHERE is_public_preview = true;

DROP POLICY IF EXISTS "anyone reads published" ON public.objects;

CREATE POLICY "authenticated reads published"
  ON public.objects FOR SELECT
  TO authenticated
  USING (status = 'published'::object_status AND hidden = false);

CREATE POLICY "anon reads preview only"
  ON public.objects FOR SELECT
  TO anon
  USING (status = 'published'::object_status AND hidden = false AND is_public_preview = true);