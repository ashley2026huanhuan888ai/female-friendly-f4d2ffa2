-- Restore public browsing for published object profiles.
-- Login is required for submitting, following, admin, and personal pages,
-- not for reading published object pages and approved observations.

DROP POLICY IF EXISTS "anon reads preview only" ON public.objects;
DROP POLICY IF EXISTS "authenticated reads published" ON public.objects;
DROP POLICY IF EXISTS "anyone reads published" ON public.objects;

CREATE POLICY "anyone reads published"
  ON public.objects
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published'::object_status AND hidden = false);
