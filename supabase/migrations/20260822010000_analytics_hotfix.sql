-- ==============================================================================
-- Migration: Analytics Security Hardening & PHT Timezone Alignment
-- ==============================================================================

-- 1. Update Monthly Trends RPC with Asia/Manila Timezone Alignment
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
      date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')),
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

-- 2. Security Hardening: Revoke public/anon execution rights across all Analytics RPCs
REVOKE EXECUTE ON FUNCTION public.get_monthly_appointment_trends(DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_appointment_trends(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_appointment_trends(DATE) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_today_triage_distribution(DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_today_triage_distribution(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_triage_distribution(DATE) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_clinic_key_metrics(DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_clinic_key_metrics(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clinic_key_metrics(DATE) TO authenticated, service_role;
