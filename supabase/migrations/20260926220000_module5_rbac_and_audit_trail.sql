-- Migration: Module 5 - Granular Clinical Roles & Immutable DPA 2012 Audit Trail
-- Implements compliance with Philippine Data Privacy Act of 2012 (RA 10173)

-- 1. Granular Clinical Roles in public.users
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff', 'patient'));

-- 2. Immutable Medical Audit Log Table (public.audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,          -- e.g., 'LOG_PRENATAL_VISIT', 'UPDATE_VITALS', 'VIEW_PATIENT', 'EXPORT_CLINICAL_SUMMARY', 'LOGIN'
  entity_type TEXT NOT NULL,     -- e.g., 'patients', 'visit_logs', 'maternal_episodes', 'appointments'
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for audit filtering & performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 3. Row-Level Security (RLS) on Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert Policy: Allow append-only inserts for all staff, authenticated users, and server-side actions
DROP POLICY IF EXISTS "Staff and system can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Select Policy: Strictly restricted to users with role = 'admin'
DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admin can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'admin'
    )
  );

-- NOTE: No UPDATE or DELETE policies are granted. 
-- public.audit_logs is completely immutable and append-only to satisfy DPA 2012 audit trail requirements.

-- 4. Extend RLS policies across clinical tables to support granular clinical roles
-- (admin, doctor, midwife, nurse, staff)

-- appointments
DROP POLICY IF EXISTS "Staff manage all appointments" ON public.appointments;
CREATE POLICY "Staff manage all appointments" ON public.appointments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff'))
  );

-- patients
DROP POLICY IF EXISTS "Staff manage all patients" ON public.patients;
CREATE POLICY "Staff manage all patients" ON public.patients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff'))
  );

-- visit_logs
DROP POLICY IF EXISTS "Staff manage all visit logs" ON public.visit_logs;
CREATE POLICY "Staff manage all visit logs" ON public.visit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff'))
  );

-- maternal_episodes
DROP POLICY IF EXISTS "Staff manage maternal episodes" ON public.maternal_episodes;
CREATE POLICY "Staff manage maternal episodes" ON public.maternal_episodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff'))
  );

-- prenatal_lab_results
DROP POLICY IF EXISTS "Staff manage prenatal labs" ON public.prenatal_lab_results;
CREATE POLICY "Staff manage prenatal labs" ON public.prenatal_lab_results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff'))
  );

-- postpartum_records
DROP POLICY IF EXISTS "Staff can manage postpartum records" ON public.postpartum_records;
CREATE POLICY "Staff can manage postpartum records" ON public.postpartum_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff'))
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
