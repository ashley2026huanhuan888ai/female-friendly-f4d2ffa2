CREATE TABLE public.presence_sessions (
  visitor_id text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Shanghai')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.presence_sessions TO service_role;

ALTER TABLE public.presence_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX presence_sessions_last_seen_at_idx ON public.presence_sessions (last_seen_at DESC);
CREATE INDEX presence_sessions_last_seen_date_idx ON public.presence_sessions (last_seen_date);