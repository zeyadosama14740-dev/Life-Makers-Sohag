REVOKE SELECT ON public.data_sources FROM anon, authenticated;
GRANT SELECT (id,label,url,spreadsheet_id,category,year,enabled,created_at,source_type,config,updated_at) ON public.data_sources TO anon, authenticated;
GRANT ALL ON public.data_sources TO service_role;
COMMENT ON COLUMN public.data_sources.import_tabs IS 'Private raw import grids, read only in server handlers and admin-authorized previews; never projected into the public dataset.';