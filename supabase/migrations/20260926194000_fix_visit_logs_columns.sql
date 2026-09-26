-- Migration: Add missing clinical columns to visit_logs and reload PostgREST schema cache
ALTER TABLE public.visit_logs
  ADD COLUMN IF NOT EXISTS aog_by_lmp text,
  ADD COLUMN IF NOT EXISTS aog_by_utz text,
  ADD COLUMN IF NOT EXISTS temp text,
  ADD COLUMN IF NOT EXISTS pr text,
  ADD COLUMN IF NOT EXISTS rr text,
  ADD COLUMN IF NOT EXISTS fh text,
  ADD COLUMN IF NOT EXISTS fht text,
  ADD COLUMN IF NOT EXISTS ie text,
  ADD COLUMN IF NOT EXISTS next_visit date;

-- Reload Supabase PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
