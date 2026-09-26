-- Migration: 20260926170000_module1_walkin_and_queue.sql
-- Description: Module 1 - Walk-in patient intake, queue ticket numbering, and public lobby queue display RLS

-- 1. Add walk-in and queue tracking columns to public.appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS queue_ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Index for fast queue querying
CREATE INDEX IF NOT EXISTS idx_appointments_queue 
  ON public.appointments (appointment_date, triage_status, status);

-- 3. Policy for public lobby queue display
DROP POLICY IF EXISTS "Public can view active queue appointments" ON public.appointments;
CREATE POLICY "Public can view active queue appointments"
  ON public.appointments
  FOR SELECT
  TO anon, authenticated
  USING (
    appointment_date = CURRENT_DATE 
    AND (status IN ('Approved', 'Completed') OR triage_status = 'Discharged')
  );

-- 4. Ensure Realtime is enabled for public.appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- 5. Drop any recursive policy on patients that queries appointments
DROP POLICY IF EXISTS "Public can view patient name for active queue" ON public.patients;

-- 6. SECURITY DEFINER function to fetch today's queue safely without RLS recursion
CREATE OR REPLACE FUNCTION public.get_today_queue()
RETURNS TABLE (
  id uuid,
  ticket_number text,
  service_type text,
  triage_status text,
  patient_name text,
  attending_staff_id uuid,
  is_walk_in boolean,
  checked_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id,
    a.queue_ticket_number AS ticket_number,
    a.service_type,
    a.triage_status,
    p.full_name AS patient_name,
    a.attending_staff_id,
    a.is_walk_in,
    a.checked_in_at
  FROM appointments a
  LEFT JOIN patients p ON p.id = a.patient_id
  WHERE a.appointment_date = CURRENT_DATE
    AND (a.status IN ('Approved', 'Completed') OR a.triage_status = 'Discharged')
  ORDER BY a.checked_in_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_queue() TO anon, authenticated, service_role;
