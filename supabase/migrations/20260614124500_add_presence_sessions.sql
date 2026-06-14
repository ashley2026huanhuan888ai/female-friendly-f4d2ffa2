-- Private presence sessions for aggregate admin metrics.
-- Stores only an anonymous visitor id and recent activity timestamps.

CREATE TABLE IF NOT EXISTS public.presence_sessions (
  visitor_id text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Shanghai')::date),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT presence_sessions_visitor_id_length CHECK (char_length(visitor_id) BETWEEN 16 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_last_seen
  ON public.presence_sessions(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_last_seen_date
  ON public.presence_sessions(last_seen_date);

REVOKE ALL PRIVILEGES ON TABLE public.presence_sessions FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.presence_sessions TO service_role;

ALTER TABLE public.presence_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads presence sessions" ON public.presence_sessions;
DROP POLICY IF EXISTS "users insert presence sessions" ON public.presence_sessions;
DROP POLICY IF EXISTS "admin reads presence sessions" ON public.presence_sessions;
DROP POLICY IF EXISTS "admin updates presence sessions" ON public.presence_sessions;

DROP TRIGGER IF EXISTS presence_sessions_updated ON public.presence_sessions;
CREATE TRIGGER presence_sessions_updated
BEFORE UPDATE ON public.presence_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
