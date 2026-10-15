-- Migration: 20261016000500_refine_maternal_risk_scorer.sql
-- Module: Evidence-Based Maternal Clinical Risk Scorer & Clearance Tracking
-- Closes Finding 9: Normalizes weight spikes by elapsed time and enables clinical resolution

-- 1. Add structured clinical risk reasons and clinician resolution tracking to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS risk_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS risk_cleared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_cleared_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS risk_cleared_notes TEXT;

-- 2. Refined Maternal Risk Scorer Function with True Elapsed Rate
CREATE OR REPLACE FUNCTION public.trg_calculate_maternal_risk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sys INT;
  v_dia INT;
  v_weight NUMERIC;
  v_prev_weight NUMERIC;
  v_prev_date DATE;
  v_days_diff INT;
  v_rate_per_week NUMERIC;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_is_high_risk BOOLEAN := false;
BEGIN
  -- 1. Blood Pressure Evaluation (Systolic >= 140 or Diastolic >= 90)
  v_sys := NEW.systolic_bp;
  v_dia := NEW.diastolic_bp;

  -- Fallback if text bp was passed directly
  IF v_sys IS NULL AND NEW.bp IS NOT NULL AND NEW.bp LIKE '%/%' THEN
    BEGIN
      v_sys := split_part(NEW.bp, '/', 1)::INT;
      v_dia := split_part(NEW.bp, '/', 2)::INT;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF v_sys IS NOT NULL AND v_dia IS NOT NULL THEN
    IF v_sys >= 140 OR v_dia >= 90 THEN
      v_is_high_risk := true;
      v_reasons := array_append(v_reasons, 'Hypertension (BP ' || v_sys || '/' || v_dia || ' mmHg)');
    END IF;
  END IF;

  -- 2. Weight Evaluation Normalized by Elapsed Days
  v_weight := NEW.weight_kg;
  IF v_weight IS NULL AND NEW.weight IS NOT NULL AND NEW.weight ~ '^[0-9]+(\.[0-9]+)?$' THEN
    BEGIN
      v_weight := NEW.weight::NUMERIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF v_weight IS NOT NULL THEN
    -- Retrieve previous visit with recorded weight
    SELECT 
      COALESCE(weight_kg, CASE WHEN weight ~ '^[0-9]+(\.[0-9]+)?$' THEN weight::NUMERIC ELSE NULL END),
      visit_date
    INTO v_prev_weight, v_prev_date
    FROM public.visit_logs
    WHERE patient_id = NEW.patient_id
      AND id != NEW.id
      AND (weight_kg IS NOT NULL OR weight ~ '^[0-9]+(\.[0-9]+)?$')
      AND visit_date <= NEW.visit_date
    ORDER BY visit_date DESC
    LIMIT 1;

    IF v_prev_weight IS NOT NULL AND v_prev_date IS NOT NULL THEN
      v_days_diff := NEW.visit_date - v_prev_date;

      IF v_days_diff > 0 THEN
        -- Case A: Acute weight spike (>= 2.0 kg within 14 days or less)
        IF (v_weight - v_prev_weight) >= 2.0 AND v_days_diff <= 14 THEN
          v_is_high_risk := true;
          v_reasons := array_append(v_reasons, 'Acute Weight Spike (+' || ROUND((v_weight - v_prev_weight), 1) || ' kg in ' || v_days_diff || ' days)');
        
        -- Case B: Excessive rate of weight gain (> 1.0 kg/week across 15+ days)
        ELSE
          v_rate_per_week := (v_weight - v_prev_weight) / (v_days_diff / 7.0);
          IF v_rate_per_week > 1.0 AND (v_weight - v_prev_weight) > 1.5 THEN
            v_is_high_risk := true;
            v_reasons := array_append(v_reasons, 'Excessive Weight Rate (+' || ROUND(v_rate_per_week, 1) || ' kg/wk over ' || v_days_diff || ' days)');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 3. If High Risk triggered, update patient record
  IF v_is_high_risk THEN
    UPDATE public.patients
    SET is_high_risk = true,
        risk_reasons = array_cat(COALESCE(risk_reasons, ARRAY[]::TEXT[]), v_reasons),
        risk_cleared_at = NULL,
        risk_cleared_by = NULL,
        risk_cleared_notes = NULL
    WHERE id = NEW.patient_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-bind trigger to visit_logs
DROP TRIGGER IF EXISTS trg_auto_score_maternal_risk ON public.visit_logs;
CREATE TRIGGER trg_auto_score_maternal_risk
  AFTER INSERT OR UPDATE OF bp, weight, systolic_bp, diastolic_bp, weight_kg
  ON public.visit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_calculate_maternal_risk();

NOTIFY pgrst, 'reload schema';
