-- Migration: 20261016000300_typed_clinical_vitals.sql
-- Module: Clinical Data Type Integrity
-- Adds typed integer and numeric columns to visit_logs for accurate physiological computations,
-- while maintaining full backward-compatibility with existing legacy string inputs.

-- 1. Add typed numeric columns
ALTER TABLE public.visit_logs
  ADD COLUMN IF NOT EXISTS systolic_bp INTEGER,
  ADD COLUMN IF NOT EXISTS diastolic_bp INTEGER,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);

-- 2. Backfill existing rows
UPDATE public.visit_logs
SET 
  systolic_bp = CASE 
    WHEN bp LIKE '%/%' AND split_part(bp, '/', 1) ~ '^[0-9]+$' 
    THEN split_part(bp, '/', 1)::INTEGER 
    ELSE NULL 
  END,
  diastolic_bp = CASE 
    WHEN bp LIKE '%/%' AND split_part(bp, '/', 2) ~ '^[0-9]+$' 
    THEN split_part(bp, '/', 2)::INTEGER 
    ELSE NULL 
  END,
  weight_kg = CASE 
    WHEN weight ~ '^[0-9]+(\.[0-9]+)?$' 
    THEN weight::NUMERIC(5,2) 
    ELSE NULL 
  END
WHERE systolic_bp IS NULL AND diastolic_bp IS NULL AND weight_kg IS NULL;

-- 3. Bi-directional synchronization trigger
CREATE OR REPLACE FUNCTION public.trg_sync_vitals_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync BP: If text is provided, parse into systolic/diastolic
  IF NEW.bp IS NOT NULL AND NEW.bp LIKE '%/%' THEN
    BEGIN
      IF split_part(NEW.bp, '/', 1) ~ '^[0-9]+$' THEN
        NEW.systolic_bp := split_part(NEW.bp, '/', 1)::INTEGER;
      END IF;
      IF split_part(NEW.bp, '/', 2) ~ '^[0-9]+$' THEN
        NEW.diastolic_bp := split_part(NEW.bp, '/', 2)::INTEGER;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  ELSIF NEW.systolic_bp IS NOT NULL AND NEW.diastolic_bp IS NOT NULL THEN
    NEW.bp := NEW.systolic_bp || '/' || NEW.diastolic_bp;
  END IF;

  -- Sync Weight: If text weight is provided, parse into numeric
  IF NEW.weight IS NOT NULL AND NEW.weight ~ '^[0-9]+(\.[0-9]+)?$' THEN
    BEGIN
      NEW.weight_kg := NEW.weight::NUMERIC(5,2);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  ELSIF NEW.weight_kg IS NOT NULL THEN
    NEW.weight := NEW.weight_kg::TEXT;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_vitals ON public.visit_logs;
CREATE TRIGGER trg_sync_vitals
  BEFORE INSERT OR UPDATE OF bp, weight, systolic_bp, diastolic_bp, weight_kg
  ON public.visit_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_vitals_types();

NOTIFY pgrst, 'reload schema';
