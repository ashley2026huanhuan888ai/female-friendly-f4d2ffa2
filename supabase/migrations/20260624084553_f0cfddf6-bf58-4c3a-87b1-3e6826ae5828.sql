DROP POLICY IF EXISTS "Approved comments are public" ON public.object_comments;
CREATE POLICY "Approved comments visible to authenticated"
  ON public.object_comments
  FOR SELECT
  TO authenticated
  USING ((status = 'approved') OR (user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));