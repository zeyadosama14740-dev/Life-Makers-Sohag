CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First person to sign up becomes admin; everyone after is a viewer.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  spreadsheet_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('activities','volunteers','master_plan','other')),
  year integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads sources" ON public.data_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert sources" ON public.data_sources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update sources" ON public.data_sources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete sources" ON public.data_sources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.data_sources (label, url, spreadsheet_id, category, year) VALUES
('المتطوعين والأنشطة', 'https://docs.google.com/spreadsheets/d/1MT_19UG8Tn2Zb9wjvGLtuwGKtNUDCBe6wUggYDfkVFM/edit', '1MT_19UG8Tn2Zb9wjvGLtuwGKtNUDCBe6wUggYDfkVFM', 'activities', 2026),
('الماستر بلان 2026', 'https://docs.google.com/spreadsheets/d/19bVJwsYanaa6KHlAoKVt_1JCslDzSKHodwnGQ2glNF8/edit', '19bVJwsYanaa6KHlAoKVt_1JCslDzSKHodwnGQ2glNF8', 'master_plan', 2026);