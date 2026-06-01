
DROP POLICY IF EXISTS "anyone reads published" ON public.objects;
CREATE POLICY "anyone reads published" ON public.objects
  FOR SELECT TO anon, authenticated
  USING (status = 'published'::object_status AND hidden = false);
