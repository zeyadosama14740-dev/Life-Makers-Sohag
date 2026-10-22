ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'center_manager';

CREATE TABLE public.user_center_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  center text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, center)
);
GRANT SELECT ON public.user_center_access TO authenticated;
GRANT ALL ON public.user_center_access TO service_role;
ALTER TABLE public.user_center_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own centers" ON public.user_center_access FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all centers" ON public.user_center_access FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));