CREATE TABLE public.sheet_cache (source_id uuid PRIMARY KEY REFERENCES public.data_sources(id), tabs jsonb NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now(), retry_at timestamptz);
GRANT ALL ON public.sheet_cache TO service_role;
ALTER TABLE public.sheet_cache ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.sheet_cache IS 'Private durable last-good source grids; available only to narrow server source reads, never anonymous Data API.';