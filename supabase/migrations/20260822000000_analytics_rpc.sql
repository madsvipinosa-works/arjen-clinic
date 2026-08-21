-- ==============================================================================
-- Migration: Analytics Composite Indexes and High-Performance Aggregation RPCs
-- ==============================================================================

-- 1. Composite & Partial Performance Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_analytics 
  ON public.appointments (appointment_date, status, triage_status);

CREATE INDEX IF NOT EXISTS idx_maternal_episodes_active 
  ON public.maternal_episodes (status) 
  WHERE status = 'Active';

-- 2. Stored Procedure: Monthly Appointment Trends (Zero-Gap Series)
CREATE OR REPLACE FUNCTION public.get_monthly_appointment_trends(start_date DATE)
RETURNS TABLE (
  month_label TEXT,
  month_date DATE,
  total_count BIGINT,
  completed_count BIGINT,
  cancelled_count BIGINT,
  approved_count BIGINT
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', start_date::timestamp),
      date_trunc('month', CURRENT_DATE::timestamp),
      '1 month'::interval
    )::date AS m
  )
  SELECT
    to_char(m.m, 'Mon YYYY') AS month_label,
    m.m AS month_date,
    COUNT(a.id) AS total_count,
    COUNT(a.id) FILTER (WHERE a.status = 'Completed') AS completed_count,
    COUNT(a.id) FILTER (WHERE a.status IN ('Cancelled', 'Rejected')) AS cancelled_count,
    COUNT(a.id) FILTER (WHERE a.status = 'Approved') AS approved_count
  FROM months m
  LEFT JOIN public.appointments a 
    ON date_trunc('month', a.appointment_date) = m.m
  GROUP BY m.m
  ORDER BY m.m ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_monthly_appointment_trends(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_appointment_trends(DATE) TO authenticated, service_role, anon;

-- 3. Stored Procedure: Today's Triage Distribution
CREATE OR REPLACE FUNCTION public.get_today_triage_distribution(target_date DATE)
RETURNS TABLE (
  status_name TEXT,
  patient_count BIGINT
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
  WITH statuses AS (
    SELECT unnest(ARRAY['Waiting', 'Vital Signs', 'Consultation', 'Discharged']) AS s
  )
  SELECT
    s.s AS status_name,
    COUNT(a.id) AS patient_count
  FROM statuses s
  LEFT JOIN public.appointments a 
    ON a.triage_status = s.s
    AND a.appointment_date = target_date
    AND a.status = 'Approved'
  GROUP BY s.s
  ORDER BY CASE s.s
    WHEN 'Waiting' THEN 1
    WHEN 'Vital Signs' THEN 2
    WHEN 'Consultation' THEN 3
    WHEN 'Discharged' THEN 4
    ELSE 5
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_today_triage_distribution(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_triage_distribution(DATE) TO authenticated, service_role, anon;

-- 4. Stored Procedure: Key Metric Summary Counts
CREATE OR REPLACE FUNCTION public.get_clinic_key_metrics(target_date DATE)
RETURNS TABLE (
  total_patients BIGINT,
  active_pregnancies BIGINT,
  today_appointments BIGINT,
  today_completed BIGINT
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.patients) AS total_patients,
    (SELECT COUNT(*) FROM public.maternal_episodes WHERE status = 'Active') AS active_pregnancies,
    (SELECT COUNT(*) FROM public.appointments WHERE appointment_date = target_date AND status != 'Rejected') AS today_appointments,
    (SELECT COUNT(*) FROM public.appointments WHERE appointment_date = target_date AND (status = 'Completed' OR triage_status = 'Discharged')) AS today_completed;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clinic_key_metrics(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clinic_key_metrics(DATE) TO authenticated, service_role, anon;
