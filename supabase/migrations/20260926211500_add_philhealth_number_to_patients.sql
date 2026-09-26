-- Migration: Add philhealth_number to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS philhealth_number TEXT;

NOTIFY pgrst, 'reload schema';
