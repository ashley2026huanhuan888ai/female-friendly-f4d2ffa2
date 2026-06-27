
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.object_type AS ENUM ('brand','product','service','organization','film','game','show','event');
CREATE TYPE public.object_status AS ENUM ('published','draft');
CREATE TYPE public.observation_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.evidence_level AS ENUM ('A','B','C','D');
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected');

-- ===== profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ===== user_roles =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== has_role function =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== objects =====
CREATE TABLE public.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.object_type NOT NULL,
  description TEXT,
  temperature NUMERIC(5,2) NOT NULL DEFAULT 24,
  ai_summary TEXT,
  top_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.object_status NOT NULL DEFAULT 'published',
  observation_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX objects_temp_idx ON public.objects(temperature DESC);
CREATE INDEX objects_type_idx ON public.objects(type);
GRANT SELECT ON public.objects TO anon, authenticated;
GRANT ALL ON public.objects TO service_role;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads published" ON public.objects FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "admin reads all objects" ON public.objects FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin writes objects" ON public.objects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== object_requests =====
CREATE TABLE public.object_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_name TEXT NOT NULL,
  requested_type public.object_type NOT NULL,
  reason TEXT,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.object_requests TO authenticated;
GRANT ALL ON public.object_requests TO service_role;
ALTER TABLE public.object_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own request" ON public.object_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "users read own request" ON public.object_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "admin reads requests" ON public.object_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates requests" ON public.object_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== observations =====
CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scene TEXT,
  screenshot_url TEXT,
  reference_url TEXT,
  cleaned_content TEXT,
  evidence_level public.evidence_level,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.observation_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX obs_object_idx ON public.observations(object_id);
CREATE INDEX obs_status_idx ON public.observations(status);
GRANT SELECT, INSERT ON public.observations TO authenticated;
GRANT SELECT ON public.observations TO anon;
GRANT ALL ON public.observations TO service_role;
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads approved obs" ON public.observations FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "users read own obs" ON public.observations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own obs" ON public.observations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin reads obs" ON public.observations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates obs" ON public.observations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== analysis_logs =====
CREATE TABLE public.analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.analysis_logs TO service_role;
GRANT SELECT ON public.analysis_logs TO authenticated;
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads logs" ON public.analysis_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ===== auto profile + default role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER objects_updated BEFORE UPDATE ON public.objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER obs_updated BEFORE UPDATE ON public.observations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
