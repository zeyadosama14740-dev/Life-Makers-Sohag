CREATE TABLE public.photo_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.photo_folders TO anon, authenticated;
GRANT INSERT, DELETE ON public.photo_folders TO authenticated;
GRANT ALL ON public.photo_folders TO service_role;
ALTER TABLE public.photo_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads photo folders" ON public.photo_folders FOR SELECT USING (true);
CREATE POLICY "Admins add photo folders" ON public.photo_folders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove photo folders" ON public.photo_folders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));