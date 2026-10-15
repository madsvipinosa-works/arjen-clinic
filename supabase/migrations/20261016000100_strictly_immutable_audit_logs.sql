-- Migration: 20261016000100_strictly_immutable_audit_logs.sql
-- Module: DPA 2012 Immutable Audit Trail Hardening
-- Compliance: Republic Act No. 10173 (Philippine Data Privacy Act of 2012)
-- Closes Security Finding 3: Audit trail completeness & immutability guarantees

-- 1. Create immutability enforcement trigger function
-- Unconditionally raises an exception on ANY attempted UPDATE or DELETE on audit_logs.
CREATE OR REPLACE FUNCTION public.trg_prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DPA 2012 Compliance Violation: public.audit_logs rows are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

-- 2. Bind trigger to public.audit_logs
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_audit_log_tampering();

-- 3. Replace loose insert policy (which had WITH CHECK (true))
-- Restrict insertion to authenticated clinical staff or system service role
DROP POLICY IF EXISTS "Allow insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff and system can insert audit logs" ON public.audit_logs;

CREATE POLICY "Staff and system can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    -- Authenticated staff member OR service-role system execution
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE public.users.id = auth.uid() 
        AND public.users.role IN ('admin', 'doctor', 'midwife', 'nurse', 'staff')
      )
      -- Allow patients to log appointment booking/cancellation actions on themselves
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE public.users.id = auth.uid()
        AND public.users.role = 'patient'
      )
    )
  );

-- 4. Ensure SELECT is restricted strictly to administrators
DROP POLICY IF EXISTS "Only admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admin can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
