-- Private platform feedback inbox.
-- Feedback may contain contact details, so browser roles get no direct table access.

CREATE TABLE IF NOT EXISTS public.platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 5 AND 2000),
  contact_type text CHECK (contact_type IS NULL OR contact_type IN ('wechat', 'email', 'other')),
  contact text CHECK (contact IS NULL OR char_length(contact) <= 160),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_feedback_status_created
  ON public.platform_feedback(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_feedback_created
  ON public.platform_feedback(created_at DESC);

REVOKE ALL PRIVILEGES ON TABLE public.platform_feedback FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.platform_feedback TO service_role;

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads platform feedback" ON public.platform_feedback;
DROP POLICY IF EXISTS "users insert platform feedback" ON public.platform_feedback;
DROP POLICY IF EXISTS "admin reads platform feedback" ON public.platform_feedback;
DROP POLICY IF EXISTS "admin updates platform feedback" ON public.platform_feedback;

DROP TRIGGER IF EXISTS platform_feedback_updated ON public.platform_feedback;
CREATE TRIGGER platform_feedback_updated
BEFORE UPDATE ON public.platform_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
